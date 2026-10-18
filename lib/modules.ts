import type { Course, Progress, Week } from './types';
import { currentWeek } from './course';

export type Module = { key: string; name: string; weeks: Week[] };

/** Agrupa as semanas em módulos (álbuns) pelo campo `section` de cada semana. */
export function modules(course: Course): Module[] {
  const out: Module[] = [];
  course.weeks.forEach((w) => {
    if (w.section || !out.length) {
      const i = out.length + 1;
      const name = (w.section || `Módulo ${i}`).replace(/^Módulo \d+\s*·\s*/, '');
      out.push({ key: 'm' + i, name: name === `Módulo ${i}` ? 'Trilha principal' : name, weeks: [] });
    }
    out[out.length - 1].weeks.push(w);
  });
  return out;
}

export const weekDone = (p: Progress, n: number) => (p.checks[n] || []).filter(Boolean).length;
export const isComplete = (p: Progress, n: number) => weekDone(p, n) === 7;

export function moduleOfWeek(course: Course, n: number) {
  return modules(course).find((m) => m.weeks.some((w) => w.n === n));
}

export function currentModuleKey(course: Course, p: Progress) {
  return moduleOfWeek(course, currentWeek(p))?.key || 'm1';
}

/** Módulos abertos ficam lembrados neste aparelho */
const KEY = 'ascolto-open-modules';
export function loadOpen(lang: string): string[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Array.isArray(v[lang]) ? v[lang] : null;
  } catch {
    return null;
  }
}
export function saveOpen(lang: string, keys: string[]) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    v[lang] = keys;
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}
