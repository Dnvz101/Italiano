export type Card = [string, string, string, string]; // [idioma, português, exemplo, exemplo PT]

export type Week = {
  n: number;
  section?: string;
  title: string;
  artist: string;
  year: number;
  level: string;
  lv: number;
  theme: string;
  about: string;
  why: string;
  hunt: string[];
  lesson: string; // HTML confiável (vem do nosso conteúdo)
  cards: Card[];
};

export type CourseMeta = {
  name: string;
  flag: string;
  lang: string;
  locale: string;
  hello: string;
  lyr: string;
  test: string;
  day6: string;
  imm: string; // HTML confiável
};

export type Course = { lang: string; sort: number; meta: CourseMeta; weeks: Week[] };

export type SrsEntry = { box: number; due: string };

export type Progress = {
  started: number[];
  songs: string[]; // ids de músicas próprias em estudo
  checks: Record<string, boolean[]>;
  srs: Record<string, SrsEntry>;
  imm: Record<string, number>;
};

export type Phrase = { id: string; lang: string; text: string; meaning: string; note: string };

export type LyricLine = { t: string; ai: string };
export type FullLesson = {
  excerpts: { line: string; translation: string; association: string; memorize: string; expand: [string, string][] }[];
  sounds: { sound: string; how: string; examples: string[] }[];
  trivia: string[];
  model?: string;
  created_at?: string;
};
export type Lyric = { id: string; lang: string; song_key: string; lines: LyricLine[]; lesson?: FullLesson | null };

export type Profile = {
  id: string;
  name: string;
  household_id: string | null;
  settings: { lang?: string; dir?: 'it' | 'pt' | 'audio'; level?: Record<string, number> };
};

export type Household = { id: string; name: string; invite_code: string };

export type StudyCard = { id: string; w?: number; it: string; pt: string; ex: string; exPt: string; label: string };

export type Session = { queue: string[]; done: number; shown: boolean };

export type SongAnalysis = {
  level_reason: string;
  signals: { speed: string; vocab: string; grammar: string[]; slang: string; wpm?: number | null };
  theme: string;
  about: string;
  why: string;
  hunt: string[];
  lesson: string; // HTML sanitizado no servidor (p, b, i, br)
  cards: Card[];
  suggestions: { title: string; artist: string; level: number; reason: string }[];
};

export type Song = {
  id: string;
  user_id: string;
  lang: string;
  title: string;
  artist: string;
  level: number;
  duration_sec: number | null;
  analysis: SongAnalysis;
  created_at: string;
};
