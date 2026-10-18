/**
 * Ícones ilustrados do Ascolto (public/icons). Cada um tem a versão clara e a escura;
 * o CSS mostra a certa conforme o tema, sem piscar.
 */
export type IconName =
  | 'home'
  | 'trilha'
  | 'conversa'
  | 'cards'
  | 'frases'
  | 'metodo'
  | 'roteiro'
  | 'letra'
  | 'aula'
  | 'shadowing'
  | 'perfil-musical'
  | 'cacapalavras'
  | 'imersao'
  | 'favoritas'
  | 'ajustes';

export default function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <span className={`ic ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img className="ic-l" src={`/icons/${name}.svg`} width={size} height={size} alt="" decoding="async" />
      <img className="ic-d" src={`/icons/${name}-dark.svg`} width={size} height={size} alt="" decoding="async" loading="lazy" />
    </span>
  );
}
