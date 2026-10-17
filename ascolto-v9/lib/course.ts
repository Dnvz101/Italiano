import type { Course, Phrase, Progress, StudyCard, SrsEntry } from './types';

export const IV = [0, 1, 3, 7, 14, 30, 60, 120];
export const IMM_GOAL = 30;

export const today = () => new Date().toLocaleDateString('sv');
export const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T12:00:00');
  x.setDate(x.getDate() + n);
  return x.toLocaleDateString('sv');
};

export const blankProgress = (): Progress => ({ started: [1], checks: {}, srs: {}, imm: {} });

export function roteiro(course: Course): [string, string][] {
  return [
    ['Escuta às cegas', 'Ouça 3 vezes sem letra. Anote qualquer palavra que reconhecer, sem se cobrar.'],
    ['Escuta com letra', 'Abra a letra e ouça 2 vezes acompanhando. Procure as palavras do Caça-palavras.'],
    ['Cards + escuta', 'Estude os cards da semana na aba Cards e ouça a música mais 2 vezes.'],
    ['Escuta passiva', 'Deixe a música em loop por uns 30 minutos enquanto faz outras coisas (cozinhar, dirigir, arrumar).'],
    ['Shadowing', 'Cante junto, imitando ritmo, entonação e pronúncia. Pode ser no chuveiro!'],
    [
      'Substituição guiada',
      `Pegue uma estrutura da semana e troque só uma palavra (ex.: ${course.meta.day6}). Anote na aba Frases. Falar em voz alta é opcional nas primeiras semanas.`,
    ],
    ['Escuta final', 'Ouça sem letra e compare com o dia 1. Quanto você entende agora?'],
  ];
}

export function getCard(course: Course, phrases: Phrase[], id: string): StudyCard | null {
  if (id.startsWith('m-')) {
    const m = phrases.find((x) => 'm-' + x.id === id);
    return m ? { id, it: m.text, pt: m.meaning, ex: m.note || '', exPt: '' } : null;
  }
  const r = /^w(\d+)-(\d+)$/.exec(id);
  if (!r) return null;
  const w = course.weeks.find((x) => x.n === +r[1]);
  const c = w && w.cards[+r[2]];
  return c ? { id, w: w.n, it: c[0], pt: c[1], ex: c[2], exPt: c[3] } : null;
}

export function deck(course: Course, p: Progress, phrases: Phrase[]) {
  const ids: string[] = [];
  [...p.started].sort((a, b) => a - b).forEach((n) => {
    const w = course.weeks.find((x) => x.n === n);
    if (w) w.cards.forEach((_, i) => ids.push(`w${n}-${i}`));
  });
  phrases.forEach((m) => ids.push('m-' + m.id));
  return ids;
}

export function dueList(course: Course, p: Progress, phrases: Phrase[]) {
  const t = today();
  const due: string[] = [];
  const fresh: string[] = [];
  deck(course, p, phrases).forEach((id) => {
    const s = p.srs[id];
    if (!s) fresh.push(id);
    else if (s.due <= t) due.push(id);
  });
  return { due, fresh };
}

export function makeQueue(course: Course, p: Progress, phrases: Phrase[], extra: boolean) {
  const { due, fresh } = dueList(course, p, phrases);
  let q = [...due, ...fresh.slice(0, 10)];
  if (!q.length && extra) q = deck(course, p, phrases).sort(() => Math.random() - 0.5).slice(0, 20);
  return q;
}

export function nextBox(g: number, s?: SrsEntry) {
  const b = s ? s.box : 0;
  return g === 1 ? Math.max(1, b) : Math.min(7, g === 2 ? b + 1 : b + 2);
}
export const gradeLabel = (g: number, s?: SrsEntry) => {
  const d = IV[nextBox(g, s)];
  return d === 1 ? '1 dia' : d + ' dias';
};

export function streak(days: string[]) {
  const set = new Set(days);
  let n = 0;
  let d = today();
  if (!set.has(d)) d = addDays(d, -1);
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export const immDay = (p: Progress, d: string) => p.imm[d] || 0;
export function immWeek(p: Progress) {
  let s = 0;
  let d = today();
  for (let i = 0; i < 7; i++) {
    s += immDay(p, d);
    d = addDays(d, -1);
  }
  return s;
}
export const learnedCount = (p: Progress) => Object.values(p.srs).filter((s) => s.box >= 3).length;
export const currentWeek = (p: Progress) => Math.max(...p.started);
