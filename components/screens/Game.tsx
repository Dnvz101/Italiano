'use client';
import { useCourse } from '@/lib/nav';
import { langPt } from '@/lib/langs';

/** Lugar reservado para o jogo (dungeon com loot no idioma). Por enquanto, a vitrine do que vem aí. */
export default function Game() {
  const { lang } = useCourse();
  const ex: Record<string, [string, string][]> = {
    it: [['la pozione', 'poção'], ['la spada', 'espada'], ['lo zaino', 'mochila'], ['la chiave', 'chave']],
    de: [['der Trank', 'poção'], ['das Schwert', 'espada'], ['der Rucksack', 'mochila'], ['der Schlüssel', 'chave']],
    ja: [['ポーション', 'poção'], ['剣', 'espada'], ['リュック', 'mochila'], ['鍵', 'chave']],
  };
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
          Explore salas, abra baús e enfrente monstros. Para abrir os baús raros, você reconhece, ouve ou fala a palavra em{' '}
          {langPt(lang)}. Cada item que você ganha tem o nome no idioma e vai para a sua revisão nos Cards.
        </p>
        <div className="gs-loot">
          {(ex[lang] || ex.it).map(([w, pt]) => (
            <span key={w}>
              <b>{w}</b>
              <small>{pt}</small>
            </span>
          ))}
        </div>
        <p className="mut" style={{ marginBottom: 0 }}>
          As chaves para entrar vêm do seu estudo do dia: cards, roteiro e músicas.
        </p>
      </div>
    </>
  );
}
