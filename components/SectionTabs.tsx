'use client';
import { useEffect, useRef, useState } from 'react';

export type Section = { id: string; icon: string; label: string; badge?: string | number | null };

const KEY = 'ascolto-section';

/** Lembra a última seção aberta (quem estava na Letra continua na Letra ao ir para a próxima semana). */
export function useSection(ids: string[], fallback: string) {
  const [cur, setCur] = useState(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v && ids.includes(v)) return v;
    } catch {}
    return fallback;
  });
  const set = (v: string) => {
    setCur(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  };
  return [ids.includes(cur) ? cur : fallback, set] as const;
}

/** Abas fixas no topo da página da música: cada parte do estudo fica a um toque, sem rolar. */
export default function SectionTabs({
  sections,
  value,
  onChange,
}: {
  sections: Section[];
  value: string;
  onChange: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // gruda logo abaixo da barra do topo, seja qual for a altura dela no aparelho
  useEffect(() => {
    const bar = document.querySelector('.topbar') as HTMLElement | null;
    const el = ref.current;
    if (!bar || !el) return;
    const fit = () => {
      const visible = getComputedStyle(bar).display !== 'none';
      el.style.top = visible ? `${bar.getBoundingClientRect().height}px` : '';
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(bar);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, []);

  const pick = (id: string) => {
    onChange(id);
    // se a pessoa já desceu na página, volta para o começo da seção
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const stuck = parseFloat(getComputedStyle(el).top) || 0;
      if (top <= stuck + 1) {
        const anchor = el.previousElementSibling as HTMLElement | null;
        const y = anchor
          ? anchor.getBoundingClientRect().bottom + window.scrollY - stuck + 14
          : window.scrollY + top - stuck;
        window.scrollTo({ top: y });
      }
    });
  };
  return (
    <div className="stabs" ref={ref} role="tablist" aria-label="Partes do estudo">
      {sections.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={s.id === value}
          className={s.id === value ? 'on' : ''}
          onClick={() => pick(s.id)}
        >
          <span className="stabs-i" aria-hidden="true">
            {s.icon}
          </span>
          <span className="stabs-l">{s.label}</span>
          {s.badge != null && s.badge !== '' && <span className="stabs-b">{s.badge}</span>}
        </button>
      ))}
    </div>
  );
}
