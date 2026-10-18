'use client';
import type { ReactNode } from 'react';

/** Um "disco" da estante: cabeçalho que abre e fecha uma lista de faixas. */
export default function Disc({
  id,
  open,
  onToggle,
  title,
  subtitle,
  done,
  total,
  tone = 'trail',
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  title: string;
  subtitle: string;
  done: number;
  total: number;
  tone?: 'trail' | 'fav';
  children: ReactNode;
}) {
  const pct = total ? done / total : 0;
  return (
    <section className={`disc disc-${tone} ${open ? 'open' : ''}`}>
      <button className="disc-head" onClick={onToggle} aria-expanded={open} aria-controls={`disc-${id}`}>
        <span className="disc-art" aria-hidden="true">
          <span className="disc-label" />
        </span>
        <span className="disc-text">
          <b>{title}</b>
          <span className="mut">{subtitle}</span>
          <span className="disc-bar" aria-hidden="true">
            <i style={{ transform: `scaleX(${pct})` }} />
          </span>
        </span>
        <span className="disc-chev" aria-hidden="true" />
      </button>
      <div className="disc-body" id={`disc-${id}`} role="region" aria-label={title}>
        <div className="disc-inner" inert={!open ? true : undefined}>
          {children}
        </div>
      </div>
    </section>
  );
}

/** Equalizador do "tocando agora" */
export const Eq = () => (
  <span className="eq" aria-label="semana atual">
    <i />
    <i />
    <i />
  </span>
);
