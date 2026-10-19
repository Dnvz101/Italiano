'use client';
import { createContext, useContext } from 'react';
import type { Course, Phrase, Progress, Session, Song } from '@/lib/types';

export type View = 'home' | 'weeks' | 'week' | 'songs' | 'song' | 'chat' | 'review' | 'mine' | 'method' | 'settings' | 'lang' | 'import' | 'taste' | 'explore' | 'admin';

export type AppCtx = {
  view: View;
  param: any;
  go: (v: View, p?: any) => void;
  lang: string | null;
  course: Course | null;
  progress: Progress | null;
  phrases: Phrase[];
  songs: Song[]; // músicas do idioma atual (minhas e da família)
  dir: 'it' | 'pt' | 'audio';
  session: Session | null;
  setSession: (s: Session | null) => void;
  startReview: (extra?: boolean) => void;
  autoSay: (s: Session) => void;
  speak: (text: string, rate?: number, onEnd?: () => void) => void;
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
