'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { chorusLines } from '@/lib/level';
import Spk from '../Spk';
import LyricsSearch from '../LyricsSearch';
import Shadow from '../Shadow';
import AiProgress from '../AiProgress';
import Icon from '../Icon';
import { requestLesson, requestTranslation } from '@/lib/lesson';
import { hasJa, ro } from '@/lib/kana';
import Jt from '../Jt';

export default function Lyrics({
  songKey,
  label,
  title,
  artist,
  chorusDefault = false,
}: {
  songKey: string;
  label: string;
  title: string;
  artist: string;
  chorusDefault?: boolean;
}) {
  const s = useStore();
  const { lang, course } = useCourse();
  const key = songKey;
  const row = s.lyrics[`${lang}:${key}`];
  const answers = (row && s.answers[row.id]) || {};

  const isCourseWeek = /^w\d+$/.test(key);
  const pubShared = isCourseWeek ? s.shared[`${lang}:${key}`] : undefined;
  // semana do curso com letra publicada pelo admin: a pessoa já recebe a letra traduzida, sem buscar nem gastar IA
  const adopting = useRef(false);
  useEffect(() => {
    const ls = pubShared?.lines;
    if (row || adopting.current || !ls?.some((l) => l.t)) return;
    adopting.current = true;
    (async () => {
      const saved = await s.saveLyrics(lang, key, ls.map((l) => l.t));
      if (saved) await s.setLyricAi(saved.id, ls.map((l) => l.ai || ''), ls.map((l) => l.kana || ''));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, pubShared]);
  const [pub, setPub] = useState<'idle' | 'busy' | 'ok'>('idle');
  const publishAll = async () => {
    if (!row) return;
    if (!confirm('Publicar a letra, a tradução e a aula desta semana para todos os usuários?')) return;
    setPub('busy');
    setPub((await s.publishShared(lang, key, { lines: row.lines, lesson: row.lesson || null })) ? 'ok' : 'idle');
  };
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState<'ex' | 'read' | 'shadow'>('ex');
  const readMode = mode === 'read';
  const [shadowAt, setShadowAt] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [chorus, setChorus] = useState(chorusDefault);

  const startEdit = () => {
    setDraft(row ? row.lines.map((l) => l.t).join('\n') : '');
    setEditing(true);
  };

  // salvar a letra já prepara a tradução e a aula completa (sem precisar ir na aba Aula)
  const [prepare, setPrepare] = useState(true);
  const [prep, setPrep] = useState<{ tr: boolean; lesson: boolean } | null>(null);
  const [prepMsg, setPrepMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    const lines = draft.replace(/\r/g, '').split('\n').map((x) => x.trim());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    const changed = !row || row.lines.map((l) => l.t).join('\n') !== lines.join('\n');
    const saved = await s.saveLyrics(lang, key, lines);
    setEditing(false);
    if (!saved || !prepare || !lines.some(Boolean)) return;
    const sh = isCourseWeek ? s.shared[`${lang}:${key}`] : undefined;
    // tradução já publicada para esta semana: aproveita nas linhas iguais (não gasta IA)
    let cur = saved;
    if (sh?.lines?.length) {
      const m = new Map(sh.lines.map((l) => [l.t, l]));
      const ais = saved.lines.map((l) => l.ai || m.get(l.t)?.ai || '');
      const kanas = saved.lines.map((l) => l.kana || m.get(l.t)?.kana || '');
      if (ais.some((a, i) => a && !saved.lines[i].ai)) {
        await s.setLyricAi(saved.id, ais, kanas);
        cur = { ...saved, lines: saved.lines.map((l, i) => ({ ...l, ai: ais[i], ...(kanas[i] ? { kana: kanas[i] } : {}) })) };
      }
    }
    const texts = cur.lines.map((l) => l.t);
    const filled = cur.lines.filter((l) => l.t && l.ai && (lang !== 'ja' || l.kana)).length;
    const needTr = filled < cur.lines.filter((l) => l.t).length * 0.8;
    // aula: se já existe uma publicada para esta semana, todo mundo usa ela
    const needLesson = (!saved.lesson || changed) && !sh?.lesson;
    if (!needTr && !needLesson) {
      if (sh?.lesson || sh?.lines) setPrepMsg({ ok: true, text: '✅ Tradução e aula prontas!' });
      return;
    }
    setPrepMsg(null);
    setPrep({ tr: needTr, lesson: needLesson });
    const errs: string[] = [];
    await Promise.all([
      needTr &&
        requestTranslation(lang, texts)
          .then(async (t) => {
            await s.setLyricAi(saved.id, t.translations, t.readings);
          })
          .catch((e) => errs.push('tradução: ' + e.message)),
      needLesson &&
        requestLesson(lang, title, artist, texts)
          .then(async (l) => {
            await s.setLyricLesson(saved.id, l);
          })
          .catch((e) => errs.push('aula: ' + e.message)),
    ]);
    setPrep(null);
    setPrepMsg(
      errs.length
        ? { ok: false, text: `Não deu para preparar tudo (${errs.join('; ')}). Tente de novo pelos botões.` }
        : {
            ok: true,
            text: needLesson ? '✅ Tradução e aula prontas! A aula completa está na aba 🎓 Aula.' : '✅ Tradução pronta!',
          }
    );
  };

  const prepBox = prep ? (
    <AiProgress
      className="prep-ring"
      expectedMs={prep.lesson ? 25000 : 4000 + draft.split('\n').length * 250}
      steps={
        prep.lesson
          ? ['Salvando a letra…', 'Traduzindo linha por linha…', 'Escolhendo os melhores trechos…', 'Comentando os versos…', 'Separando os sons difíceis…', 'Buscando curiosidades…']
          : ['Traduzindo linha por linha…', 'Deixando a tradução natural…']
      }
    />
  ) : prepMsg ? (
    <p className={prepMsg.ok ? 'prep-ok' : 'err'} role="status">
      {prepMsg.text}
    </p>
  ) : null;

  const toggle = (i: number) => {
    const n = new Set(shown);
    n.has(i) ? n.delete(i) : n.add(i);
    setShown(n);
  };

  const aiTranslate = async () => {
    if (!row || busy) return;
    setBusy(true);
    try {
      const r = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ from: lang, lines: row.lines.map((l) => l.t) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
      await s.setLyricAi(row.id, d.translations, d.readings);

    } catch (e: any) {
      alert(e.message);
    }
    setBusy(false);
  };

  const lineCard = async (i: number) => {
    const l = row.lines[i];
    const pt = answers[l.t] || l.ai;
    if (!pt && !confirm('Esta linha ainda não tem tradução. Criar o card assim mesmo?')) return;
    await s.addPhrase(lang, l.t, pt || '(tradução pendente)', `Letra ${label}`);
    alert(lang === 'ja' ? 'Virou card! Ele aparece na revisão da aba Cards.' : 'Virou card na aba Frases!');
  };

  if (!row && !editing && pubShared?.lines?.some((l) => l.t))
    return (
      <div className="card">
        <p className="mut" style={{ margin: 0 }}>Carregando a letra…</p>
      </div>
    );

  if (!row || editing)
    return (
      <div className="card">
        <h3 className="ih"><Icon name="letra" size={28} /> Letra bilíngue</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Busque automaticamente ou cole a letra aqui. O app separa linha por linha. A letra fica visível só para a sua
          família.
        </p>
        <LyricsSearch title={title} artist={artist} onPick={(t) => setDraft(t)} />
        <textarea rows={8} placeholder="Cole a letra aqui..." value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={save} disabled={!draft.trim()}>
            {prepare ? '✨ Salvar e preparar a aula' : 'Salvar letra'}
          </button>
          {row && (
            <button className="btn ghost sm" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          )}
        </div>
        <label className="switch" style={{ marginTop: 10, marginBottom: 0 }}>
          <input type="checkbox" checked={prepare} onChange={(e) => setPrepare(e.target.checked)} /> Preparar também a
          tradução e a aula completa (IA)
        </label>
      </div>
    );

  const chorusIdx = new Set(chorusLines(row.lines.map((l) => l.t)));
  const focus = chorus && chorusIdx.size > 0;
  const total = row.lines.filter((l) => l.t).length;
  const mine = row.lines.filter((l) => l.t && answers[l.t]).length;
  const hasAi = row.lines.some((l) => l.ai);
  const ja = lang === 'ja';

  return (
    <div className="card">
      <h3 className="ih"><Icon name="letra" size={28} /> Letra bilíngue</h3>
      {prepBox}
      <div className="seg">
        <button className={mode === 'ex' ? 'on' : ''} onClick={() => setMode('ex')}>
          ✍️ Exercício
        </button>
        <button className={mode === 'read' ? 'on' : ''} onClick={() => setMode('read')}>
          📖 Leitura
        </button>
        <button className={mode === 'shadow' ? 'on' : ''} onClick={() => setMode('shadow')}>
          <Icon name="shadowing" size={18} /> Shadowing
        </button>
      </div>
      <p className="mut">
        {mode === 'shadow' ? (
          <>
            Ouça a linha e repita na hora, imitando o jeito de falar. O app grava você e mostra quais palavras saíram
            claras.
          </>
        ) : readMode ? (
          'A letra com a tradução da IA embaixo de cada linha.'
        ) : (
          <>
            Digite a sua tradução de cada linha. Na dúvida, toque em 👁️ para ver a da IA. <b>{mine}/{total}</b> linhas
            traduzidas por você.
          </>
        )}
      </p>
      {chorusIdx.size > 0 && (
        <label className="switch">
          <input type="checkbox" checked={chorus} onChange={(e) => setChorus(e.target.checked)} /> 🎯 Só o refrão (
          {chorusIdx.size === 1 ? '1 linha que se repete' : `${chorusIdx.size} linhas que se repetem`})
        </label>
      )}
      {mode === 'shadow' ? (
        <Shadow
          lines={row.lines}
          order={row.lines.map((l, i) => i).filter((i) => row.lines[i].t && (!focus || chorusIdx.has(i)))}
          songKey={`${lang}:${key}`}
          startAt={shadowAt}
          onLine={setShadowAt}
        />
      ) : (
      <>
      <div className="row" style={{ marginBottom: 6 }}>
        <button className={`btn ${hasAi ? 'ghost' : ''} sm`} onClick={aiTranslate} disabled={busy}>
          {busy ? 'Traduzindo...' : hasAi ? '✨ Refazer IA' : '✨ Gerar tradução da IA'}
        </button>
        <button className="btn ghost sm" onClick={startEdit}>
          Editar letra
        </button>
      </div>
      {s.isAdmin && isCourseWeek && (
        <button className="btn ghost sm pub-all" onClick={publishAll} disabled={pub === 'busy'}>
          {pub === 'ok'
            ? '✓ Publicado para todos'
            : pub === 'busy'
              ? 'Publicando…'
              : pubShared?.lines
                ? '📤 Publicar de novo para todos (letra, tradução e aula)'
                : '📤 Publicar para todos (letra, tradução e aula)'}
        </button>
      )}
      {busy && (
        <AiProgress
          expectedMs={4000 + total * 250}
          steps={['Lendo a letra…', 'Traduzindo linha por linha…', 'Deixando a tradução natural…']}
        />
      )}

      {row.lines.map((l, i) => {
        if (focus && !chorusIdx.has(i)) return null;
        if (!l.t) return <div key={i} style={{ height: 12 }} />;
        const open = shown.has(i);
        return (
          <div key={i} className="lyl">
            <div className="lyt">
              <Spk text={l.t} />
              <span>
                <Jt text={l.t} />
                {ja && (l.kana || hasJa(l.t)) && <small className="ly-ro">{ro(l.kana || l.t) || l.kana}</small>}
              </span>
              {!readMode && (
                <button className="spk" onClick={() => toggle(i)} aria-label="Ver tradução da IA">
                  {open ? '🙈' : '👁️'}
                </button>
              )}
              <button
                className="spk"
                onClick={() => {
                  setShadowAt(i);
                  setMode('shadow');
                }}
                aria-label="Repetir esta linha (shadowing)"
              >
                🎙️
              </button>
              <button className="spk" onClick={() => lineCard(i)} aria-label="Virar card">
                ➕
              </button>
            </div>
            {readMode ? (
              <div className="lyai">{l.ai || answers[l.t] || <i>sem tradução ainda</i>}</div>
            ) : (
              <>
                <input
                  className="lytr"
                  defaultValue={answers[l.t] || ''}
                  placeholder="sua tradução..."
                  autoComplete="off"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (answers[l.t] || '')) s.setAnswer(row.id, l.t, v);
                  }}
                />
                {open && (
                  <div className="lyai">
                    🤖{' '}
                    {l.ai || (
                      <>
                        ainda não gerada ·{' '}
                        <a
                          href={`https://translate.google.com/?sl=${course.meta.lang}&tl=pt&text=${encodeURIComponent(l.t)}&op=translate`}
                          target="_blank"
                          rel="noopener"
                        >
                          Google Tradutor
                        </a>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {!readMode && (
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn ghost sm" onClick={() => setShown(new Set(row.lines.map((_, i) => i)))}>
            Conferir todas com a IA
          </button>
          <button className="btn ghost sm" onClick={() => setShown(new Set())}>
            Esconder todas
          </button>
        </div>
      )}
      </>
      )}
    </div>
  );
}
