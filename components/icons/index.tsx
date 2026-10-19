/**
 * Biblioteca de ícones do Ascolto (redesign v24).
 * Estilo da referência: traço arredondado + preenchimento menta (duotone).
 * Cores por CSS: --ic-s (traço) e --ic-f (preenchimento). Padrão: traço = cor do texto, preenchimento = menta suave.
 * Elementos com class "f" recebem o preenchimento; "s" só traço; "solid" é preenchido com a cor do traço.
 */
const G: Record<string, string> = {
  home: '<path class="f" d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path class="s" d="M9.5 20.5v-5.5h5v5.5"/>',
  trilha:
    '<path class="s" d="M12 21V3"/><path class="f" d="M12 5h6.5l2 2-2 2H12z"/><path class="f" d="M12 11H5.5l-2 2 2 2H12z"/><path class="s" d="M8.5 21h7"/>',
  conversa:
    '<path class="f" d="M3.5 6.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v3.5a3 3 0 0 1-3 3H9l-3.5 3v-3a3 3 0 0 1-2-2.8z"/><path class="f" d="M12.5 15.5h3l3.5 3v-3.1a3 3 0 0 0 1.5-2.6v-3a3 3 0 0 0-2.5-3"/>',
  cards:
    '<rect class="f" x="7.5" y="3" width="11" height="15" rx="2.5" transform="rotate(10 13 10.5)"/><rect class="f" x="4" y="5.5" width="11" height="15" rx="2.5"/>',
  frases:
    '<rect class="f" x="4.5" y="3" width="15" height="18" rx="2.5"/><path class="s" d="M8 8h8M8 12h8M8 16h5"/>',
  metodo:
    '<path class="f" d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5V16c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/><path class="s" d="M9.5 19.5h5M10.5 22h3"/>',
  camera:
    '<path class="f" d="M3.5 8.5A2 2 0 0 1 5.5 6.5h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/><circle class="s" cx="12" cy="13" r="3.6"/>',
  calendar:
    '<rect class="f" x="3.5" y="5" width="17" height="15.5" rx="3"/><path class="s" d="M8 3v4M16 3v4M3.5 10h17"/><path class="s" d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01"/>',
  brain:
    '<path class="f" d="M9.5 4a3 3 0 0 0-3 2.6A3 3 0 0 0 4 9.5c0 .9.4 1.7 1 2.2-.6.6-1 1.4-1 2.3a3 3 0 0 0 2.5 3A3 3 0 0 0 12 18.5V5.5A2.5 2.5 0 0 0 9.5 4zM14.5 4a3 3 0 0 1 3 2.6A3 3 0 0 1 20 9.5c0 .9-.4 1.7-1 2.2.6.6 1 1.4 1 2.3a3 3 0 0 1-2.5 3A3 3 0 0 1 12 18.5V5.5A2.5 2.5 0 0 1 14.5 4z"/><path class="s" d="M8.5 9.5c.8 0 1.5.7 1.5 1.5M15.5 9.5c-.8 0-1.5.7-1.5 1.5M8.5 14.5H10M14 14.5h1.5"/>',
  music: '<path class="s" d="M9 18V5.5l10-2V16"/><circle class="f" cx="6.5" cy="18" r="2.8"/><circle class="f" cx="16.5" cy="16" r="2.8"/>',
  play: '<path class="solid" d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/>',
  arrow: '<path class="s" d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path class="s" d="M9 6l6 6-6 6"/>',
  back: '<path class="s" d="M15 6l-6 6 6 6"/>',
  aula: '<path class="f" d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path class="s" d="M6.5 11v4.5c1.5 1.5 3.5 2.3 5.5 2.3s4-.8 5.5-2.3V11M21.5 9v5"/>',
  documento:
    '<path class="f" d="M6 3h8l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-15A1.5 1.5 0 0 1 6.5 3z"/><path class="s" d="M14 3v5h5M8.5 12.5h7M8.5 16h5"/>',
  lupa: '<circle class="f" cx="10.5" cy="10.5" r="6.5"/><path class="s" d="M15.5 15.5 20.5 20.5"/>',
  fones:
    '<path class="s" d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect class="f" x="3" y="13.5" width="5" height="7" rx="2"/><rect class="f" x="16" y="13.5" width="5" height="7" rx="2"/>',
  vinil:
    '<circle class="f" cx="12" cy="12" r="9"/><circle class="s" cx="12" cy="12" r="5.5"/><circle class="solid" cx="12" cy="12" r="1.6"/>',
  gear:
    '<path class="f" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle class="s" cx="12" cy="12" r="3"/>',
  book: '<path class="f" d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path class="s" d="M12 6v13.5"/>',
  mic: '<rect class="f" x="9" y="2.5" width="6" height="11" rx="3"/><path class="s" d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
  star: '<path class="f" d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.9z"/>',
  heart: '<path class="f" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
  ear: '<path class="f" d="M7 9.5a5.5 5.5 0 0 1 11 0c0 3-2.5 4-3 6.5-.4 2-1.6 3.5-3.5 3.5A3 3 0 0 1 8.5 17"/><path class="s" d="M10 9.5a2.5 2.5 0 0 1 5 0c0 1.5-1.5 2-1.5 3.5"/>',
  yt: '<rect x="2" y="5" width="20" height="14" rx="4.5" fill="#ff1f1f"/><path d="M10 9v6l5.2-3z" fill="#fff"/>',
  spotify:
    '<circle cx="12" cy="12" r="10" fill="#1ed760"/><path d="M7 9.5c3.6-1 7.3-.7 10.2.9M7.6 12.6c3-.8 6-.5 8.4.8M8.2 15.5c2.4-.6 4.6-.4 6.6.6" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>',
  bars: '<rect class="solid" x="4" y="13" width="3.6" height="7" rx="1.2"/><rect class="solid" x="10.2" y="9" width="3.6" height="11" rx="1.2"/><rect class="solid" x="16.4" y="4.5" width="3.6" height="15.5" rx="1.2"/>',
  sparkle: '<path class="f" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path class="s" d="M19 16v4M17 18h4"/>',
};

export type IcName = keyof typeof G;

export default function Ic({ name, size = 24, className = '' }: { name: IcName; size?: number; className?: string }) {
  return (
    <svg
      className={`ic2 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: G[name] }}
    />
  );
}

/** Bandeiras em SVG (arredondadas), para a pílula de idioma */
export function Flag({ lang, size = 26 }: { lang: string; size?: number }) {
  const h = Math.round(size * 0.72);
  const bands =
    lang === 'de'
      ? ['#1f1f1f', '#dd2f2f', '#f6c21c'].map((c, i) => `<rect y="${(i * 18) / 3}" width="26" height="6" fill="${c}"/>`)
      : ['#1f9d55', '#ffffff', '#e1393a'].map((c, i) => `<rect x="${(i * 26) / 3}" width="8.67" height="18" fill="${c}"/>`);
  return (
    <svg
      className="flag2"
      width={size}
      height={h}
      viewBox="0 0 26 18"
      aria-hidden="true"
      dangerouslySetInnerHTML={{
        __html: `<clipPath id="fc-${lang}"><rect width="26" height="18" rx="4"/></clipPath><g clip-path="url(#fc-${lang})">${bands.join('')}</g><rect x=".5" y=".5" width="25" height="17" rx="3.5" fill="none" stroke="rgba(0,0,0,.08)"/>`,
      }}
    />
  );
}
