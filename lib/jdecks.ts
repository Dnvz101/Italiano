// Baralhos extras do japonês na aba Cards: hiragana, katakana e kanji básicos.
// Usam a mesma revisão espaçada (progress.srs), com ids próprios: "kh:あ", "kk:ア", "kj:日".
import { HIRA, KATA } from './alphabet';
import { KANJI } from './kanji';
import type { StudyCard } from './types';

export type Deck = 'main' | 'kh' | 'kk' | 'kj';
export const JDECKS: { id: Deck; label: string; short: string }[] = [
  { id: 'main', label: '🗂️ Músicas', short: 'Músicas' },
  { id: 'kh', label: 'あ Hiragana', short: 'Hiragana' },
  { id: 'kk', label: 'ア Katakana', short: 'Katakana' },
  { id: 'kj', label: '漢 Kanji', short: 'Kanji' },
];
/** Cartas novas por dia em cada baralho */
export const NEW_PER_DAY: Record<string, number> = { kh: 10, kk: 10, kj: 5 };

export function deckIds(deck: Deck): string[] {
  if (deck === 'kh') return HIRA.filter((k) => k[0] !== 'を').map((k) => 'kh:' + k[0]);
  if (deck === 'kk') return KATA.filter((k) => k[0] !== 'ヲ').map((k) => 'kk:' + k[0]);
  if (deck === 'kj') return KANJI.map((k) => 'kj:' + k[0]);
  return [];
}

export function jdeckCard(id: string): StudyCard | null {
  const [d, ch] = [id.slice(0, 2), id.slice(3)];
  if (d === 'kh' || d === 'kk') {
    const k = (d === 'kh' ? HIRA : KATA).find((x) => x[0] === ch);
    if (!k) return null;
    return { id, it: k[0], pt: k[1], ex: k[3], exPt: k[4], label: d === 'kh' ? 'Hiragana' : 'Katakana', info: k[2], glyph: true };
  }
  if (d === 'kj') {
    const k = KANJI.find((x) => x[0] === ch);
    if (!k) return null;
    const read = [k[2] && `on: ${k[2]}`, k[3] && `kun: ${k[3]}`].filter(Boolean).join(' · ');
    return { id, it: k[0], pt: k[1], ex: k[4], exPt: k[5], label: 'Kanji', info: read, glyph: true };
  }
  return null;
}
