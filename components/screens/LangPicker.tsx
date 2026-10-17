'use client';
import { useStore } from '@/lib/store';
import { useApp } from '@/lib/nav';
import { currentWeek, learnedCount, blankProgress } from '@/lib/course';

export default function LangPicker() {
  const s = useStore();
  const { setLang } = useApp();
  const list = Object.values(s.courses).sort((a, b) => a.sort - b.sort);
  return (
    <>
      <h2 style={{ textAlign: 'center', marginTop: 24 }}>Qual idioma hoje?</h2>
      <p className="mut" style={{ textAlign: 'center' }}>
        Olá, <b>{s.profile.name}</b>. Cada idioma tem seu próprio progresso.
      </p>
      {list.map((c) => {
        const p = s.progress[c.lang] || blankProgress();
        return (
          <button key={c.lang} className="langcard" onClick={() => setLang(c.lang)}>
            <span className="flag">{c.meta.flag}</span>
            <span className="t">
              <b>{c.meta.name}</b>
              <span className="mut">
                Semana {currentWeek(p)} de {c.weeks.length} · {learnedCount(p)} cards firmes
              </span>
            </span>
            <span className="go">›</span>
          </button>
        );
      })}
    </>
  );
}
