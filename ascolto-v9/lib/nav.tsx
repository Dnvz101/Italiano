'use client';
import { createContext, useContext } from 'react';
import type { Course, Phrase, Progress, Session } from '@/lib/types';

export type View = 'home' | 'weeks' | 'week' | 'review' | 'mine' | 'method' | 'settings' | 'lang' | 'import';

export type AppCtx = {
  view: View;
  param: any;
  go: (v: View, p?: any) => void;
  lang: string | null;
  course: Course | null;
  progress: Progress | null;
  phrases: Phrase[];
  dir: 'it' | 'pt' | 'audio';
  session: Session | null;
  setSession: (s: Session | null) => void;
  startReview: (extra?: boolean) => void;
  autoSay: (s: Session) => void;
  speak: (text: string) => void;
  setLang: (l: string) => void;
  closeImport: () => void;
};

export const AppContext = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(AppContext);
  if (!c) throw new Error('AppContext ausente');
  return c;
};

/** Para telas que só existem com um idioma escolhido */
export const useCourse = () => {
  const a = useApp();
  return { ...a, lang: a.lang!, course: a.course!, progress: a.progress! };
};
