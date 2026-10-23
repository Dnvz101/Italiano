'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import Spk from './Spk';
import Jt from './Jt';
import AiProgress from './AiProgress';
import Icon from './Icon';
import { requestLesson } from '@/lib/lesson';
import TutorChat from './TutorChat';

/** Aula completa da música: trechos comentados (A.M.E.), sons e curiosidades. Uma chamada de IA, salva para a família. */
export default function FullLessonCard({ songKey, title, artist }: { songKey: string; title: string; artist: string }) {
  const s = useStore();
  const { lang } = useCourse();
  const row = s.lyrics[`${lang}:${songKey}`];
  const course = /^w\d+$/.test(songKey); // semana do curso (pode ser compartilhada)
  const shared = course ? s.shared[`${lang}:${songKey}`]?.lesson : null;
  const lesson = row?.lesson || shared;
  const [pub, setPub] = useState<'idle' | 'busy' | 'ok'>('idle');
  const publish = async (l = row?.lesson) => {
    if (!l || !course || !s.isAdmin) return;
    setPub('busy');
    setPub((await s.publishShared(lang, songKey, { lesson: l, lines: row?.lines })) ? 'ok' : 'idle');
    // publica a letra + tradução + aula de uma vez
  };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [tutor, setTutor] = useState<{ line: string; translation: string; tip: string } | null>(null);

  const generate = async () => {
    if (!row || busy) return;
    if (lesson && !confirm('Gerar a aula de novo? A atual será substituída.')) return;
    setBusy(true);
    setErr('');
    try {
      const l = await requestLesson(lang, title, artist, row.lines.map((x) => x.t));
      await s.setLyricLesson(row.id, l);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  if (!row && !lesson)
    return (
      <div className="card lesson-cta">
        <h3 className="ih"><Icon name="aula" size={28} /> Aula completa</h3>
        <p className="mut" style={{ margin: 0 }}>
          Busque ou cole a letra na aba 📄 Letra para liberar os trechos comentados, os sons e as curiosidades desta música.
        </p>
      </div>
    );

  if (!lesson)
    return (
      <div className="card lesson-cta">
        <h3 className="ih"><Icon name="aula" size={28} /> Aula completa</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Versos comentados com associação, memorização e expansão, os sons difíceis da música e curiosidades. Fica salva
          para a família toda.
        </p>
        <button className="btn" onClick={generate} disabled={busy}>
          {busy ? 'Preparando a aula…' : '✨ Gerar aula completa'}
        </button>
        {busy && <AiProgress expectedMs={25000} steps={['Lendo a letra…', 'Escolhendo os melhores trechos…', 'Comentando os versos…', 'Separando os sons difíceis…', 'Buscando curiosidades…']} />}
        {err && (
          <p className="err" role="alert">
            {err}
          </p>
        )}
      </div>
    );

  return (
    <>
      <div className="card">
        <h3 className="ih">
          <Icon name="cacapalavras" size={28} /> Trechos comentados
        </h3>
        <p className="mut" style={{ marginTop: 0 }}>
          <b>A</b>ssociação com o português, <b>M</b>emorização do que importa e <b>E</b>xpansão com frases novas.
        </p>
        {lesson.excerpts.map((e, i) => (
          <div key={i} className="exc">
            <div className="exc-line">
              <Spk text={e.line} />
              <Spk text={e.line} slow />
              <b>
                <Jt text={e.line} ro />
              </b>
            </div>
            <div className="exc-tr mut">{e.translation}</div>
            <dl className="ame">
              <dt>A</dt>
              <dd>{e.association}</dd>
              <dt>M</dt>
              <dd>
                {e.memorize}
                <button className="tutor-btn" onClick={() => setTutor({ line: e.line, translation: e.translation, tip: e.memorize })}>
                  🧑‍🏫 Me explica
                </button>
              </dd>
              <dt>E</dt>
              <dd>
                {e.expand.map(([it, pt], j) => (
                  <div key={j} className="exp">
                    <Spk text={it} />
                    <span>
                      <i>
                        <Jt text={it} ro />
                      </i>
                      <br />
                      <span className="mut">{pt}</span>
                    </span>
                  </div>
                ))}
              </dd>
            </dl>
          </div>
        ))}
      </div>

      {lesson.sounds.length > 0 && (
        <div className="card">
          <h3 className="ih">
            <Icon name="shadowing" size={28} /> Sons desta música
          </h3>
          {lesson.sounds.map((x, i) => (
            <div key={i} className="snd">
              <div className="snd-h">
                <span className="snd-k">{x.sound}</span>
                <span>{x.how}</span>
              </div>
              <div className="snd-ex">
                {x.examples.map((w) => (
                  <span key={w} className="chip snd-chip">
                    <Jt text={w} /> <Spk text={w} slow />
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {lesson.trivia.length > 0 && (
        <div className="card">
          <h3 className="ih">
            <Icon name="metodo" size={28} /> Curiosidades
          </h3>
          <ul className="trivia">
            {lesson.trivia.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <p className="mut" style={{ marginBottom: 0 }}>
            Geradas por IA: confira antes de contar por aí.
          </p>
        </div>
      )}

      <div className="redo">
        {row && (!shared || s.isAdmin) && (
          <button className="btn ghost sm" onClick={generate} disabled={busy}>
            {busy ? 'Refazendo…' : 'Refazer aula'}
          </button>
        )}
        {s.isAdmin && course && row?.lesson && (
          <button className="btn ghost sm" onClick={() => publish()} disabled={pub === 'busy'}>
            {pub === 'ok' ? '✓ Publicado para todos' : pub === 'busy' ? 'Publicando…' : shared ? '📤 Publicar de novo para todos' : '📤 Publicar para todos'}
          </button>
        )}
        {busy && <AiProgress expectedMs={25000} steps={['Lendo a letra…', 'Escolhendo os melhores trechos…', 'Comentando os versos…', 'Separando os sons difíceis…', 'Buscando curiosidades…']} />}
        {err && (
          <span className="err" role="alert">
            {err}
          </span>
        )}
      </div>
      {tutor && <TutorChat lang={lang} ctx={tutor} onClose={() => setTutor(null)} />}
    </>
  );
}
