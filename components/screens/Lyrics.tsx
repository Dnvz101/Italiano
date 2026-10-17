'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { chorusLines } from '@/lib/level';
import Spk from '../Spk';

export default function Lyrics({ songKey, label, chorusDefault = false }: { songKey: string; label: string; chorusDefault?: boolean }) {
  const s = useStore();
  const { lang, course } = useCourse();
  const key = songKey;
  const row = s.lyrics[`${lang}:${key}`];
  const answers = (row && s.answers[row.id]) || {};

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [readMode, setReadMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<Set<number>>(new Set());
  const [chorus, setChorus] = useState(chorusDefault);

  const startEdit = () => {
    setDraft(row ? row.lines.map((l) => l.t).join('\n') : '');
    setEditing(true);
  };

  const save = async () => {
    const lines = draft.replace(/\r/g, '').split('\n').map((x) => x.trim());
    while (lines.length && !lines[lines.length - 1]) lines.pop();
    await s.saveLyrics(lang, key, lines);
    setEditing(false);
  };

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
      await s.setLyricAi(row.id, d.translations);
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
    alert('Virou card na aba Frases!');
  };

  if (!row || editing)
    return (
      <div className="card">
        <h3>📄 Letra bilíngue</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Abra a letra (botão <b>Letra</b>), copie e cole aqui. O app separa linha por linha. A letra fica visível só para a
          sua família.
        </p>
        <textarea rows={8} placeholder="Cole a letra aqui..." value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn sm" onClick={save}>
            Salvar letra
          </button>
          {row && (
            <button className="btn ghost sm" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    );

  const chorusIdx = new Set(chorusLines(row.lines.map((l) => l.t)));
  const focus = chorus && chorusIdx.size > 0;
  const total = row.lines.filter((l) => l.t).length;
  const mine = row.lines.filter((l) => l.t && answers[l.t]).length;
  const hasAi = row.lines.some((l) => l.ai);

  return (
    <div className="card">
      <h3>📄 Letra bilíngue</h3>
      <div className="seg">
        <button className={readMode ? '' : 'on'} onClick={() => setReadMode(false)}>
          ✍️ Exercício
        </button>
        <button className={readMode ? 'on' : ''} onClick={() => setReadMode(true)}>
          📖 Leitura
        </button>
      </div>
      <p className="mut">
        {readMode ? (
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
      <div className="row" style={{ marginBottom: 6 }}>
        <button className={`btn ${hasAi ? 'ghost' : ''} sm`} onClick={aiTranslate} disabled={busy}>
          {busy ? 'Traduzindo...' : hasAi ? '✨ Refazer IA' : '✨ Gerar tradução da IA'}
        </button>
        <button className="btn ghost sm" onClick={startEdit}>
          Editar letra
        </button>
      </div>

      {row.lines.map((l, i) => {
        if (focus && !chorusIdx.has(i)) return null;
        if (!l.t) return <div key={i} style={{ height: 12 }} />;
        const open = shown.has(i);
        return (
          <div key={i} className="lyl">
            <div className="lyt">
              <Spk text={l.t} />
              <span>{l.t}</span>
              {!readMode && (
                <button className="spk" onClick={() => toggle(i)} aria-label="Ver tradução da IA">
                  {open ? '🙈' : '👁️'}
                </button>
              )}
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
    </div>
  );
}
