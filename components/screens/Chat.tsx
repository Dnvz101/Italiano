'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { currentWeek } from '@/lib/course';
import { userLevel, LEVELS, langPt } from '@/lib/level';
import { useListen } from '@/lib/listen';
import Spk from '../Spk';
import Icon from '../Icon';

type Msg = { role: 'ai' | 'me'; text: string; tr?: string; recast?: string; tip?: string };
type Topic = { id: string; label: string; title?: string; artist?: string; theme?: string; vocab?: string[]; free?: string };

const FREE: [string, string][] = [
  ['apresentar', '👋 Apresentar-se'],
  ['comida', '🍝 Comida'],
  ['viagem', '✈️ Viagem'],
  ['familia', '👨‍👩‍👧 Família'],
  ['trabalho', '💼 Trabalho'],
  ['fds', '🌅 Fim de semana'],
];

const storeKey = (uid: string, lang: string) => `ascolto-chat:${uid}:${lang}`;

export default function Chat() {
  const s = useStore();
  const { lang, course, progress: p, songs, speak } = useCourse();
  const level = userLevel(course, p, s.profile.settings.level?.[lang]);

  const topics: Topic[] = useMemo(() => {
    const w = course.weeks.find((x) => x.n === currentWeek(p)) || course.weeks[0];
    const list: Topic[] = [
      { id: 'w' + w.n, label: `🎵 ${w.title}`, title: w.title, artist: w.artist, theme: w.theme, vocab: w.cards.map((c) => c[0]) },
    ];
    songs
      .filter((x) => x.user_id === s.userId)
      .slice(0, 4)
      .forEach((x) =>
        list.push({
          id: 's:' + x.id,
          label: `⭐ ${x.title}`,
          title: x.title,
          artist: x.artist,
          theme: x.analysis?.theme,
          vocab: (x.analysis?.cards || []).map((c) => c[0]),
        })
      );
    const mp = s.profile.settings.music?.[lang];
    const fav = [...(mp?.artists || []), ...(mp?.sugg?.artists || []).slice(0, 3).map((a) => a.name)];
    if (fav.length || mp?.genres?.length)
      list.push({
        id: 'gosto',
        label: '🎧 Minhas músicas',
        free: `o gosto musical do aluno: ${[...(mp?.genres || []), ...fav].join(', ')}`,
      });
    FREE.forEach(([id, label]) => list.push({ id, label, free: label.replace(/^\S+\s/, '') }));
    return list;
  }, [course, p, songs, s.userId, s.profile.settings.music, lang]);

  const [topicId, setTopicId] = useState<string>('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [autoVoice, setAutoVoice] = useState(true);
  const [showTr, setShowTr] = useState<Set<number>>(new Set());
  const endRef = useRef<HTMLDivElement>(null);

  // conversa fica salva neste aparelho, por pessoa e idioma
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey(s.userId, lang)) || 'null');
      if (saved?.topicId) {
        setTopicId(saved.topicId);
        setMsgs(saved.msgs || []);
        setAutoVoice(saved.autoVoice ?? true);
        return;
      }
    } catch {}
    setTopicId(topics[0].id);
    setMsgs([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, s.userId]);
  useEffect(() => {
    if (!topicId) return;
    try {
      localStorage.setItem(storeKey(s.userId, lang), JSON.stringify({ topicId, msgs: msgs.slice(-40), autoVoice }));
    } catch {}
  }, [topicId, msgs, autoVoice, s.userId, lang]);
  useEffect(() => {
    endRef.current?.parentElement && window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }, [msgs.length, busy]);

  const topic = topics.find((t) => t.id === topicId) || topics[0];
  const mic = useListen(course.meta.locale, (text) => setInput(text));

  const ask = async (history: Msg[]) => {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lang,
          level,
          topic: { title: topic.title, artist: topic.artist, theme: topic.theme, vocab: topic.vocab, free: topic.free },
          messages: history.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
      const next = [...history];
      const last = next[next.length - 1];
      if (last?.role === 'me' && (d.recast || d.tip)) next[next.length - 1] = { ...last, recast: d.recast, tip: d.tip };
      next.push({ role: 'ai', text: d.reply, tr: d.translation });
      setMsgs(next);
      s.markDay();
      if (autoVoice) speak(d.reply);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    if (mic.listening) mic.stop();
    const next = [...msgs, { role: 'me' as const, text }];
    setMsgs(next);
    setInput('');
    ask(next);
  };

  const pickTopic = (id: string) => {
    if (id === topicId) return;
    if (msgs.length && !confirm('Trocar de tema começa uma conversa nova. Continuar?')) return;
    setTopicId(id);
    setMsgs([]);
    setShowTr(new Set());
  };

  const restart = () => {
    if (msgs.length && !confirm('Começar uma conversa nova?')) return;
    setMsgs([]);
    setShowTr(new Set());
    setErr('');
  };

  const toggleTr = (i: number) => {
    const n = new Set(showTr);
    n.has(i) ? n.delete(i) : n.add(i);
    setShowTr(n);
  };

  return (
    <>
      <h2 className="ih"><Icon name="conversa" size={34} /> Conversa</h2>
      <p className="mut lead">
        Converse em {langPt(lang)} no seu nível ({LEVELS[level]}). Pode falar ou escrever, e se não souber
        dizer algo, escreva em português. Os erros viram dicas, não broncas.
      </p>

      <div className="topics" role="radiogroup" aria-label="Tema da conversa">
        {topics.map((t) => (
          <button
            key={t.id}
            role="radio"
            aria-checked={t.id === topicId}
            className={`topic ${t.id === topicId ? 'on' : ''}`}
            onClick={() => pickTopic(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="chat" aria-live="polite">
        {!msgs.length && !busy && (
          <div className="chat-empty">
            <p className="mut">A conversa começa sobre {topic.title ? `"${topic.title}"` : topic.free?.toLowerCase()}.</p>
            <button className="btn" onClick={() => ask([])}>
              Começar conversa
            </button>
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === 'ai' ? (
            <div key={i} className="bub ai">
              <p>{m.text}</p>
              <div className="bub-act">
                <Spk text={m.text} />
                <Spk text={m.text} slow />
                {m.tr && (
                  <button className="link" onClick={() => toggleTr(i)}>
                    {showTr.has(i) ? 'Esconder tradução' : 'Traduzir'}
                  </button>
                )}
              </div>
              {showTr.has(i) && <p className="bub-tr">{m.tr}</p>}
            </div>
          ) : (
            <div key={i} className="me-wrap">
              <div className="bub me">
                <p>{m.text}</p>
              </div>
              {m.recast && (
                <div className="recast">
                  <span className="mut">Mais natural:</span> <b>{m.recast}</b> <Spk text={m.recast} />
                  {m.tip && <div className="mut">{m.tip}</div>}
                </div>
              )}
            </div>
          )
        )}
        {busy && (
          <div className="bub ai typing" aria-label="Escrevendo">
            <i />
            <i />
            <i />
          </div>
        )}
        {err && (
          <p className="err" role="alert">
            {err}{' '}
            <button className="link" onClick={() => ask(msgs)}>
              Tentar de novo
            </button>
          </p>
        )}
        <div ref={endRef} />
      </div>

      {(msgs.length > 0 || busy) && (
        <div className="composer">
          {mic.supported && (
            <button
              className={`mic ${mic.listening ? 'on' : ''}`}
              onClick={() => (mic.listening ? mic.stop() : mic.start())}
              aria-label={mic.listening ? 'Parar de ouvir' : 'Falar'}
              aria-pressed={mic.listening}
            >
              🎙️
            </button>
          )}
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={mic.listening ? 'Ouvindo…' : 'Escreva ou toque no 🎙️'}
            enterKeyHint="send"
            aria-label="Sua mensagem"
          />
          <button className="btn send" onClick={send} disabled={busy || !input.trim()}>
            Enviar
          </button>
        </div>
      )}
      {mic.error && <p className="err">{mic.error}</p>}

      <div className="chat-opts">
        <label className="switch">
          <input type="checkbox" checked={autoVoice} onChange={(e) => setAutoVoice(e.target.checked)} /> Ler as respostas em
          voz alta
        </label>
        {msgs.length > 0 && (
          <button className="btn ghost sm" onClick={restart}>
            Nova conversa
          </button>
        )}
      </div>
      {!mic.supported && (
        <p className="mut">Este navegador não reconhece voz: use o teclado (ou o ditado do próprio teclado do celular).</p>
      )}
    </>
  );
}
