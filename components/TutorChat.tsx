'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Spk from './Spk';
import Jt from './Jt';

type Msg = { role: 'ai' | 'me'; text: string; examples?: { t: string; pt: string }[] };
type Ctx = { line?: string; translation?: string; tip: string };

const FIRST = 'Me explica isso como se eu tivesse 12 anos.';
const QUICK = ['Me dá mais exemplos', 'Quero praticar', 'Ainda não entendi'];

/** Professor de bolso: um chat simples que explica a dica da aula como para uma criança. */
export default function TutorChat({ lang, ctx, onClose }: { lang: string; ctx: Ctx; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const end = useRef<HTMLDivElement>(null);

  const send = async (q: string) => {
    const t = q.trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'me' as const, text: t }];
    setMsgs(next);
    setText('');
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lang,
          context: ctx,
          messages: next.map((m) => ({
            role: m.role,
            text: m.text + (m.examples?.length ? '\nExemplos: ' + m.examples.map((x) => `${x.t} (${x.pt})`).join('; ') : ''),
          })),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
      setMsgs([...next, { role: 'ai', text: d.reply, examples: d.examples }]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    send(FIRST);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [msgs, busy]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return createPortal(
    <div className="tutor-bg" onClick={onClose}>
      <div className="tutor" role="dialog" aria-label="Professor" onClick={(e) => e.stopPropagation()}>
        <header className="tutor-h">
          <span className="tutor-av" aria-hidden="true">
            🧑‍🏫
          </span>
          <div>
            <b>Professor</b>
            <span className="mut">explica do jeito mais simples</span>
          </div>
          <button className="tutor-x" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </header>
        <div className="tutor-tip mut">{ctx.tip}</div>
        <div className="tutor-body">
          {msgs.map((m, i) => (
            <div key={i} className={`tmsg ${m.role}`}>
              <p>{m.text}</p>
              {!!m.examples?.length && (
                <ul className="tex">
                  {m.examples.map((x, j) => (
                    <li key={j}>
                      <Spk text={x.t} />
                      <span>
                        <i>
                          <Jt text={x.t} ro />
                        </i>
                        <br />
                        <span className="mut">{x.pt}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {busy && (
            <div className="tmsg ai typing" aria-label="Pensando">
              <i />
              <i />
              <i />
            </div>
          )}
          {err && <p className="err">{err}</p>}
          <div ref={end} />
        </div>
        {msgs.length > 1 && !busy && (
          <div className="tutor-quick">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        <form
          className="tutor-in"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Pergunte o que quiser…" enterKeyHint="send" />
          <button className="btn sm" disabled={busy || !text.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
