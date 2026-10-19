import Ic, { type IcName } from './icons';

/** Nomes usados pelas telas (mantidos), agora desenhados pela biblioteca nova de ícones. */
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

const MAP: Record<IconName, IcName> = {
  home: 'home',
  trilha: 'trilha',
  conversa: 'conversa',
  cards: 'cards',
  frases: 'frases',
  metodo: 'metodo',
  roteiro: 'calendar',
  letra: 'documento',
  aula: 'aula',
  shadowing: 'mic',
  'perfil-musical': 'fones',
  cacapalavras: 'lupa',
  imersao: 'ear',
  favoritas: 'star',
  ajustes: 'gear',
};

export default function Icon({ name, size = 24, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <span className={`icb ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Ic name={MAP[name]} size={Math.round(size * 0.92)} />
    </span>
  );
}
