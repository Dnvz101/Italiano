import { furiParts, ro as toRo } from '@/lib/kana';

/** Texto com furigana: "今日[きょう]" vira 今日 com きょう em cima. Sem a notação, devolve o texto como está.
 *  `ro`: mostra o romaji embaixo (só quando dá para calcular, isto é, japonês com leitura). */
export default function Jt({ text, className, ro }: { text: string; className?: string; ro?: boolean }) {
  const r = ro ? toRo(text) : '';
  const body =
    !text || !text.includes('[') ? (
      text
    ) : (
      furiParts(text).map((p, i) =>
        p.r ? (
          <ruby key={i}>
            {p.t}
            <rt>{p.r}</rt>
          </ruby>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )
    );
  if (!r && !className && !text?.includes('[')) return <>{text}</>;
  return (
    <span className={className} lang={text?.includes('[') || r ? 'ja' : undefined}>
      {body}
      {r && <small className="ro">{r}</small>}
    </span>
  );
}
