'use client';
import { scrollByY } from '@/lib/scroll';
import { useEffect, useRef, useState } from 'react';

/**
 * Progresso circular para as esperas da IA.
 * A API não diz quanto falta, então o anel avança por estimativa: rápido no começo e cada vez mais devagar,
 * sem nunca chegar a 100% antes da resposta. As etapas mudam conforme o tempo passa.
 */
export default function AiProgress({
  expectedMs,
  steps,
  className = '',
}: {
  expectedMs: number;
  steps: string[];
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - t0), 250);
    // no celular o anel pode nascer abaixo da dobra: traz para a vista
    const raf = requestAnimationFrame(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const over = r.bottom - (window.innerHeight - 96);
      if (over > 0) scrollByY(over);
    });
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, []);

  // curva que se aproxima de 95% sem chegar: ~80% no tempo esperado
  const value = Math.min(95, Math.round(95 * (1 - Math.exp((-1.7 * elapsed) / expectedMs))));
  const step = steps[Math.min(steps.length - 1, Math.floor((elapsed / expectedMs) * steps.length))];
  const slow = elapsed > expectedMs * 1.8;
  const left = Math.max(1, Math.round((expectedMs - elapsed) / 1000));

  const R = 45;
  const C = 2 * Math.PI * R;

  return (
    <div ref={ref} className={`aiprog ${className}`} role="status" aria-live="polite">
      <div className="aiprog-ring" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="trk" cx="50" cy="50" r={R} />
          <circle
            className="bar"
            cx="50"
            cy="50"
            r={R}
            strokeDasharray={`${(value / 100) * C} ${C}`}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <span className="aiprog-n">
          {value}
          <small>%</small>
        </span>
      </div>
      <div className="aiprog-t">
        <b>{step}</b>
        <span className="mut">
          {slow ? 'Está demorando mais que o normal, mas ainda está trabalhando…' : elapsed < expectedMs ? `uns ${left} s` : 'quase lá…'}
        </span>
      </div>
    </div>
  );
}
