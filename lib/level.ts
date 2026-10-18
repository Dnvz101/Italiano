import type { Course, Progress } from './types';
import { currentWeek } from './course';

export const LEVELS = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado'];

/** Nível do aluno: escolhido à mão em ⚙️, ou o nível da semana atual da trilha */
export function userLevel(course: Course, p: Progress, override?: number) {
  if (override && override >= 1 && override <= 4) return override;
  const w = course.weeks.find((x) => x.n === currentWeek(p));
  return w?.lv || 1;
}

export type Fit = { kind: 'ok' | 'stretch' | 'easy' | 'hard'; emoji: string; title: string; text: string };

/** Como a música se encaixa no nível da pessoa. Nunca bloqueia: muda o objetivo. */
export function songFit(songLevel: number, level: number): Fit {
  const d = songLevel - level;
  if (d === 0)
    return {
      kind: 'ok',
      emoji: '🟢',
      title: 'No seu nível',
      text: 'Perfeita para o estudo completo: roteiro de 7 dias, letra e cards.',
    };
  if (d === 1)
    return {
      kind: 'stretch',
      emoji: '🟢',
      title: 'Um pouco acima: o ponto ideal',
      text: 'É o "i+1" do Krashen: você entende a maior parte e aprende o resto. Estudo completo.',
    };
  if (d < 0)
    return {
      kind: 'easy',
      emoji: '🔵',
      title: 'Abaixo do seu nível',
      text: 'Ótima para cantar junto, soltar a pronúncia e ganhar confiança. Para avançar, veja as sugestões do mesmo artista.',
    };
  return {
    kind: 'hard',
    emoji: '🟠',
    title: 'Acima do seu nível',
    text: 'Vamos focar no refrão por enquanto (as linhas que se repetem). A música inteira volta quando você chegar lá.',
  };
}

/** Linhas que se repetem = refrão (sem IA) */
export function chorusLines(lines: string[]) {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
  const count = new Map<string, number>();
  lines.forEach((l) => {
    const k = norm(l);
    if (k) count.set(k, (count.get(k) || 0) + 1);
  });
  const seen = new Set<string>();
  const out: number[] = [];
  lines.forEach((l, i) => {
    const k = norm(l);
    if (k && (count.get(k) || 0) >= 2 && !seen.has(k)) {
      seen.add(k);
      out.push(i);
    }
  });
  return out;
}

export function parseDuration(s: string): number | null {
  const m = /^\s*(\d{1,2})[:.,h'](\d{2})\s*$/.exec(s || '');
  if (!m) return null;
  const sec = +m[1] * 60 + +m[2];
  return sec >= 30 && sec <= 1200 ? sec : null;
}
