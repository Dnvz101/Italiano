// Ferramentas para o japonês: kana ⇄ romaji e a notação de furigana 漢字[よみ].
// A notação é usada no conteúdo e nas respostas da IA: aparece como ruby (leitura em cima do kanji),
// a voz lê só o texto, e a avaliação de pronúncia compara pela leitura em hiragana.

const JA_RE = /[぀-ヿ㐀-鿿々ｦ-ﾟ]/;
export const hasJa = (s: string) => JA_RE.test(s || '');

/** Katakana → hiragana (ア → あ). Mantém ー e o resto. */
export const toHira = (s: string) =>
  (s || '').normalize('NFKC').replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// kanji (com 々 e ヶ) seguido de [leitura]
const FURI = /([㐀-鿿々ヶ〆]+)\[([^\]\n]{1,24})\]/g;

/** Texto sem a leitura: "今日[きょう]は" → "今日は" (para mostrar sem ruby e para a voz). */
export const plain = (s: string) => (s || '').replace(FURI, '$1');

/** Leitura: "今日[きょう]は" → "きょうは". Kanji sem leitura continua como está. */
export const reading = (s: string) => toHira((s || '').replace(FURI, '$2'));

/** Pedaços para desenhar com <ruby>. */
export function furiParts(s: string): { t: string; r?: string }[] {
  const out: { t: string; r?: string }[] = [];
  let last = 0;
  for (const m of (s || '').matchAll(FURI)) {
    if (m.index! > last) out.push({ t: s.slice(last, m.index) });
    out.push({ t: m[1], r: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < (s || '').length) out.push({ t: s.slice(last) });
  return out;
}

const BASE: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゔ: 'vu',
};
const SMALL: Record<string, string> = { ゃ: 'a', ゅ: 'u', ょ: 'o', ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' };
const PUNCT: Record<string, string> = { '。': '.', '、': ',', '！': '!', '？': '?', '「': '"', '」': '"', '・': ' ', '　': ' ', '〜': '~', '…': '...' };

/** Kana → romaji (Hepburn simplificado). Kanji fica como está. */
export function romaji(input: string): string {
  const s = toHira(input);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const nx = s[i + 1];
    if (c === 'っ') {
      const r = BASE[nx] || '';
      out += r ? (r.startsWith('ch') ? 't' : r[0]) : '';
      continue;
    }
    if (c === 'ー') {
      const v = out.match(/[aeiou]$/);
      out += v ? v[0] : '-';
      continue;
    }
    let r = BASE[c];
    if (r == null) {
      out += PUNCT[c] ?? c;
      continue;
    }
    // き + ゃ = kya; し + ゃ = sha; ち + ゃ = cha; じ + ゃ = ja; ふ + ぁ = fa
    if (nx && SMALL[nx] && r.length > 1) {
      const v = SMALL[nx];
      if (/^(shi|chi|ji)$/.test(r) && 'ゃゅょ'.includes(nx)) r = r.slice(0, -1) + v;
      else if ('ゃゅょ'.includes(nx)) r = r.slice(0, -1) + 'y' + v;
      else r = r.slice(0, -1) + v;
      i++;
    }
    if (c === 'ん' && nx && /^[aeiouy]/.test(BASE[nx] || '')) r = "n'";
    out += r;
  }
  return out;
}

/** Romaji de uma frase (com espaços entre as palavras, como nos livros infantis).
 *  Partícula は no fim da palavra vira "wa", へ vira "e". Se sobrar kanji sem leitura, devolve vazio. */
export function ro(s: string): string {
  const r = reading(s);
  if (!r || /[㐀-鿿]/.test(r) || !hasJa(r)) return '';
  return r
    .split(/(\s+)/)
    .map((ch) => {
      if (!ch.trim()) return ch ? ' ' : '';
      const m = ch.match(/^(.*?)([。、！？!?,.「」…]*)$/)!;
      const body = m[1];
      let out = romaji(body);
      if (body.endsWith('は')) out = out.replace(/ha$/, 'wa');
      else if (body.length > 1 && body.endsWith('へ')) out = out.replace(/he$/, 'e');
      return out + romaji(m[2]);
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Para HTML confiável (aulas do conteúdo): 漢字[よみ] vira <ruby>. */
export const furiHtml = (html: string) => (html || '').replace(FURI, '<ruby>$1<rt>$2</rt></ruby>');
