'use client';
import { useCourse } from '@/lib/nav';

export default function Weeks() {
  const { course, progress: p, go } = useCourse();
  return (
    <>
      <h2>Semanas</h2>
      <p className="mut">Uma música por semana. A ordem vai do mais lento e claro ao mais rápido.</p>
      {course.weeks.map((w) => {
        const st = p.started.includes(w.n);
        const d = (p.checks[w.n] || []).filter(Boolean).length;
        return (
          <div key={w.n}>
            {w.section && <h3 style={{ margin: '18px 0 10px', color: 'var(--mut)' }}>{w.section}</h3>}
            <button className="wk" onClick={() => go('week', w.n)}>
              <div className="n">{w.n}</div>
              <div className="t">
                <div>{w.title}</div>
                <div className="mut">
                  {w.artist} · {w.year}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`lvl l${w.lv}`}>{w.level}</span>
                <div className="mut" style={{ fontSize: 12, marginTop: 4 }}>
                  {st ? (d === 7 ? '✅ concluída' : `${d}/7 dias`) : 'não iniciada'}
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </>
  );
}
