'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Traços do KanjiVG (CC BY-SA 3.0, Ulrich Apel), na caixa 109×109, já na ordem certa. Baixado uma vez e guardado.
let strokesP: Promise<Record<string, string[]>> | null = null;
export const loadStrokes = () =>
  (strokesP ||= fetch('/strokes.json')
    .then((r) => r.json())
    .catch(() => {
      strokesP = null;
      return {};
    }));

type Pt = [number, number];
const N = 32;
const S = 109;

/** Pontos igualmente espaçados ao longo de um traço. */
function resample(pts: Pt[], n = N): Pt[] {
  if (pts.length < 2) return Array(n).fill(pts[0] || [0, 0]);
  const d: number[] = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = d[d.length - 1] || 1;
  const out: Pt[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const t = (k / (n - 1)) * total;
    while (j < d.length - 2 && d[j + 1] < t) j++;
    const seg = d[j + 1] - d[j] || 1;
    const a = (t - d[j]) / seg;
    out.push([pts[j][0] + (pts[j + 1][0] - pts[j][0]) * a, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * a]);
  }
  return out;
}
const dist = (a: Pt[], b: Pt[]) => a.reduce((t, p, i) => t + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0) / a.length;

/** Amostra um caminho SVG usando o próprio navegador. */
function samplePath(d: string): Pt[] {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', d);
  svg.appendChild(p);
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  document.body.appendChild(svg);
  const L = p.getTotalLength();
  const pts: Pt[] = [];
  for (let k = 0; k < N; k++) {
    const q = p.getPointAtLength((k / (N - 1)) * L);
    pts.push([q.x, q.y]);
  }
  svg.remove();
  return pts;
}

function bbox(strokes: Pt[][]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  strokes.flat().forEach(([x, y]) => {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  });
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size: Math.max(x1 - x0, y1 - y0, 8) };
}

export type WriteResult = { score: number; per: ('ok' | 'mid' | 'bad')[]; tips: string[] };

/** Compara o que a pessoa desenhou com os traços de referência: quantidade, ordem, direção e forma. */
export function judge(user: Pt[][], ref: Pt[][]): WriteResult {
  const tips: string[] = [];
  if (!user.length) return { score: 0, per: [], tips: ['Desenhe a letra com o dedo.'] };
  // alinha tamanho e posição (cada um escreve num canto e num tamanho)
  const bu = bbox(user), br = bbox(ref);
  const k = br.size / bu.size;
  const norm = user.map((s) => resample(s).map(([x, y]) => [(x - bu.cx) * k + br.cx, (y - bu.cy) * k + br.cy] as Pt));
  const per: WriteResult['per'] = [];
  let sum = 0;
  const m = Math.min(norm.length, ref.length);
  for (let i = 0; i < m; i++) {
    const d = dist(norm[i], ref[i]);
    const rev = dist([...norm[i]].reverse(), ref[i]);
    let s = Math.max(0, Math.min(1, 1 - (d - 7) / 20));
    if (rev + 4 < d && rev < 16) {
      tips.push(`O traço ${i + 1} foi feito ao contrário: veja de onde ele começa.`);
      s = Math.min(s, 0.45);
    } else if (s < 0.45) {
      // talvez a ordem esteja trocada
      const other = ref.findIndex((r, j) => j !== i && dist(norm[i], r) < 14);
      tips.push(other >= 0 ? `O traço ${i + 1} parece ser o ${other + 1}: confira a ordem.` : `O traço ${i + 1} ficou diferente do modelo.`);
    }
    per.push(s >= 0.75 ? 'ok' : s >= 0.45 ? 'mid' : 'bad');
    sum += s;
  }
  let score = (sum / ref.length) * 100;
  if (norm.length !== ref.length) {
    tips.unshift(`Esta letra tem ${ref.length} ${ref.length === 1 ? 'traço' : 'traços'}; você fez ${norm.length}.`);
    score *= Math.min(norm.length, ref.length) / Math.max(norm.length, ref.length);
  }
  return { score: Math.round(score), per, tips: tips.slice(0, 3) };
}

/**
 * Escrever com o dedo: modelo apagado por baixo (ou de memória), ordem dos traços animada e nota.
 * Conferido sozinho quando a quantidade de traços bate.
 */
export default function KanaWrite({
  ch,
  hint,
  memory: memoryProp,
  best,
  onScore,
  onNext,
}: {
  ch: string;
  hint?: string; // ex.: o romaji, mostrado no modo de memória
  memory?: boolean;
  best?: number;
  onScore?: (score: number) => void;
  onNext?: () => void;
}) {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [user, setUser] = useState<Pt[][]>([]);
  const [cur, setCur] = useState<Pt[] | null>(null);
  const [res, setRes] = useState<WriteResult | null>(null);
  const [memory, setMemory] = useState(!!memoryProp);
  const [anim, setAnim] = useState(0); // muda a chave para reiniciar a animação
  const box = useRef<SVGSVGElement>(null);
  const ref = useMemo(() => (paths && typeof document !== 'undefined' ? paths.map(samplePath) : []), [paths]);

  useEffect(() => {
    let on = true;
    setUser([]);
    setRes(null);
    loadStrokes().then((d) => on && setPaths(d[ch] || []));
    return () => {
      on = false;
    };
  }, [ch]);
  useEffect(() => setMemory(!!memoryProp), [memoryProp, ch]);

  const check = useCallback(
    (strokes: Pt[][]) => {
      if (!ref.length) return;
      const r = judge(strokes, ref);
      setRes(r);
      onScore?.(r.score);
    },
    [ref, onScore]
  );

  const at = (e: React.PointerEvent): Pt => {
    const r = box.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S];
  };
  const down = (e: React.PointerEvent) => {
    if (res) return;
    try {
      box.current?.setPointerCapture(e.pointerId);
    } catch {}
    setAnim(0);
    setCur([at(e)]);
  };
  const move = (e: React.PointerEvent) => {
    if (!cur) return;
    const p = at(e);
    const last = cur[cur.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.8) setCur([...cur, p]);
  };
  const up = () => {
    if (!cur) return;
    const stroke = cur.length > 1 ? cur : [cur[0], [cur[0][0] + 0.5, cur[0][1] + 0.5] as Pt];
    const next = [...user, stroke];
    setUser(next);
    setCur(null);
    if (ref.length && next.length >= ref.length) setTimeout(() => check(next), 150);
  };
  const clear = () => {
    setUser([]);
    setRes(null);
  };
  const line = (pts: Pt[]) => pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
  const tone = (n: number) => (n >= 85 ? 'ok' : n >= 60 ? 'mid' : 'low');

  if (paths && !paths.length) return <p className="mut">Ainda não tenho os traços desta letra.</p>;
  return (
    <div className="kw">
      <div className="kw-top">
        <label className="switch">
          <input type="checkbox" checked={memory} onChange={(e) => (setMemory(e.target.checked), clear())} /> De memória
        </label>
        {best != null && <span className={`sayit-best ${tone(best)}`}>melhor: {best}%</span>}
      </div>
      {memory && hint && (
        <p className="kw-ask">
          Escreva <b>{hint}</b>
        </p>
      )}
      <svg
        ref={box}
        className="kw-pad"
        viewBox={`0 0 ${S} ${S}`}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label={`Quadro para escrever ${hint || ch}`}
      >
        <path d="M54.5 4v101M4 54.5h101" className="kw-grid" />
        {paths && (!memory || res) && (
          <g className="kw-guide">
            {paths.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>
        )}
        {paths && anim > 0 && (
          <g className="kw-anim" key={anim}>
            {paths.map((d, i) => (
              <path key={i} d={d} pathLength={1} style={{ animationDelay: `${i * 0.7}s` }} />
            ))}
            {ref.map((r, i) => (
              <text key={i} x={r[0][0] - 3} y={r[0][1] - 2} style={{ animationDelay: `${i * 0.7}s` }}>
                {i + 1}
              </text>
            ))}
          </g>
        )}
        <g className="kw-ink">
          {user.map((s, i) => (
            <polyline key={i} points={line(s)} className={res ? res.per[i] || 'bad' : ''} />
          ))}
          {cur && <polyline points={line(cur)} />}
        </g>
      </svg>
      {res ? (
        <div className="kw-res pop">
          <div className={`sh-score ${tone(res.score)}`}>
            <b>{res.score}%</b>{' '}
            <span>{res.score >= 85 ? 'Lindo! ✍️' : res.score >= 60 ? 'Quase, mais uma!' : 'Veja a ordem e tente de novo.'}</span>
          </div>
          {res.tips.map((t) => (
            <p key={t} className="mut kw-tip">
              {t}
            </p>
          ))}
        </div>
      ) : (
        <p className="mut kw-tip">
          {paths ? `${paths.length} ${paths.length === 1 ? 'traço' : 'traços'} · ${user.length} feito${user.length === 1 ? '' : 's'}` : 'Carregando…'}
        </p>
      )}
      <div className="row kw-btns">
        <button className="btn ghost sm" onClick={() => setAnim((x) => x + 1)} disabled={!paths}>
          ▶ Ordem
        </button>
        {res ? (
          <button className={`btn sm ${onNext ? 'ghost' : ''}`} onClick={clear}>
            ↺ De novo
          </button>
        ) : (
          <button className="btn ghost sm" onClick={() => setUser((u) => u.slice(0, -1))} disabled={!user.length}>
            ↶ Desfazer
          </button>
        )}
        {onNext && res && (
          <button className="btn sm" onClick={onNext}>
            Próxima →
          </button>
        )}
      </div>
      <p className="kw-credit">
        Traços:{' '}
        <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">
          KanjiVG
        </a>{' '}
        (CC BY-SA 3.0)
      </p>
    </div>
  );
}
