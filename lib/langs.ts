// Idiomas do app num lugar só (servidor e navegador). Para abrir um idioma novo: entre aqui + content/<lang>.json.

export const LANGS: Record<string, { pt: string; native: string }> = {
  it: { pt: 'italiano', native: 'Italiano' },
  de: { pt: 'alemão', native: 'Deutsch' },
  ja: { pt: 'japonês', native: '日本語' },
  en: { pt: 'inglês', native: 'English' },
};

export const isLang = (c: any): c is string => typeof c === 'string' && !!LANGS[c];
export const langPt = (code: string) => LANGS[code]?.pt || code;

/** Regras de escrita para a IA quando o idioma é japonês (vale para aula, cards, tradução e conversa). */
export const JA_WRITING = `ESCRITA DO JAPONÊS (obrigatório):
- Escreva o japonês normalmente (kanji + kana), mas TODA palavra com kanji leva a leitura em hiragana entre colchetes logo depois do bloco de kanji: 今日[きょう]は 天気[てんき]が いいです / 歩[ある]く / 私[わたし]. Kana puro não leva colchetes.
- Nas frases de exemplo, cards e falas, separe as palavras com um espaço, como nos livros infantis japoneses: 私[わたし]は 学生[がくせい]です。
- Nas explicações em português, a primeira vez que citar uma palavra japonesa, coloque o romaji (Hepburn) entre parênteses: ありがとう (arigatō).
- O aluno é brasileiro e está começando: prefira palavras do dia a dia, e explique a gramática com comparações com o português.`;

/** Ilustrações das páginas por idioma (italiano e alemão usam as mesmas; japonês tem as suas). */
export const banner = (lang: string, kind: 'semana' | 'trilha') =>
  lang === 'ja' ? `/media/ja-${kind}.webp` : `/media/banner-${kind}.webp`;
