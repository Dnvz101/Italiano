import Ic, { type IcName } from './icons';

/** Compatibilidade: os ícones de traço agora vêm da biblioteca nova (components/icons). */
const MAP: Record<string, IcName> = { note: 'music' };
export type LineName = 'calendar' | 'cards' | 'brain' | 'book' | 'arrow' | 'chevron' | 'play' | 'note' | 'home' | 'gear';

export default function Line({ name, size = 22 }: { name: LineName; size?: number; stroke?: number }) {
  return <Ic name={(MAP[name] || name) as IcName} size={size} />;
}
