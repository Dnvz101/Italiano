'use client';
import { useCourse } from '@/lib/nav';
import { langPt } from '@/lib/langs';

/** Jogo (masmorra). Por enquanto só no italiano; roda isolado num iframe para não misturar CSS e scripts com o app. */
export default function Game() {
  const { lang } = useCourse();
  if (lang === 'it') {
    return (
      <div className="game-frame">
        <iframe src="/game/ascolto-masmorra/index.html" title="Ascolto Masmorra" allow="autoplay; microphone" />
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
