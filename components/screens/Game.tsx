'use client';
import { useLayoutEffect, useRef } from 'react';
import { useCourse } from '@/lib/nav';
import { langPt } from '@/lib/langs';

/** Jogo (masmorra). Por enquanto só no italiano; roda isolado num iframe para não misturar CSS e scripts com o app. */
export default function Game() {
  const { lang } = useCourse();
  const frame = useRef<HTMLIFrameElement>(null);
  // Ao sair da aba Jogo: desliga o microfone e a voz do jogo antes de tirar o iframe da tela
  // (alguns celulares deixam o microfone aceso se o iframe some no meio de uma escuta).
  // useLayoutEffect: roda antes de o iframe sair da página (com useEffect ele já teria sido removido)
  useLayoutEffect(() => {
    const el = frame.current;
    return () => {
      try {
        (el?.contentWindow as any)?.AscoltoStopMic?.();
      } catch {}
      try {
        if (el) el.src = 'about:blank';
      } catch {}
    };
  }, [lang]);
  if (lang === 'it') {
    return (
      <div className="game-frame">
        <iframe ref={frame} src="/game/ascolto-masmorra/index.html" title="Ascolto Masmorra" allow="autoplay; microphone" />
      </div>
    );
  }
  return (
    <>
      <h2>🎮 Jogo</h2>
      <div className="card game-soon">
        <div className="gs-art" aria-hidden="true">
          🗝️ 🧪 ⚔️ 🎒
        </div>
        <span className="chip gs-tag">Em breve</span>
        <h3>Uma masmorra cheia de tesouros</h3>
        <p className="mut">
          O jogo já está no italiano. Em {langPt(lang)}, ele chega quando as palavras das semanas estiverem prontas para virar
          itens.
        </p>
      </div>
    </>
  );
}
