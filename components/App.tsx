'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore, OLD_KEY, importedKey } from '@/lib/store';
import { AppContext, type AppCtx, type View } from '@/lib/nav';
import { getCard, makeQueue } from '@/lib/course';
import { say } from '@/lib/voice';
import type { Session } from '@/lib/types';
import LangPicker from './screens/LangPicker';
import Home from './screens/Home';
import Weeks from './screens/Weeks';
import Songs from './screens/Songs';
import SongView from './screens/Song';
import WeekView from './screens/Week';
import Review from './screens/Review';
import Mine from './screens/Mine';
import Method from './screens/Method';
import Settings from './screens/Settings';
import ImportLocal from './screens/ImportLocal';

const TABS: [View, string, string][] = [
  ['home', '🏠', 'Início'],
  ['weeks', '🎵', 'Trilha'],
  ['songs', '🎤', 'Músicas'],
  ['review', '🃏', 'Cards'],
  ['mine', '✍️', 'Frases'],
  ['method', '📖', 'Método'],
];

export default function App() {
  const s = useStore();
  const [view, setView] = useState<View>('home');
  const [param, setParam] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(OLD_KEY) && !localStorage.getItem(importedKey(s.userId))) setImportOpen(true);
    } catch {}
  }, [s.userId]);

  const wanted = s.profile.settings.lang;
  const lang = wanted && s.courses[wanted] ? wanted : null;
  const course = lang ? s.courses[lang] : null;
  const progress = lang ? s.progress[lang] : null;
  const phrases = useMemo(() => s.phrases.filter((p) => p.lang === lang), [s.phrases, lang]);
  const songs = useMemo(() => s.songs.filter((x) => x.lang === lang), [s.songs, lang]);
  const dir = s.profile.settings.dir || 'it';

  const go = useCallback((v: View, p: any = null) => {
    setView(v);
    setParam(p);
    window.scrollTo(0, 0);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (course) say(text, course.meta.lang, course.meta.locale);
    },
    [course]
  );

  const autoSay = useCallback(
    (ns: Session) => {
      if (dir !== 'audio' || !course || !ns.queue.length || ns.shown) return;
      const c = getCard(course, phrases, ns.queue[0], songs);
      if (c) setTimeout(() => speak(c.it), 150);
    },
    [dir, course, phrases, songs, speak]
  );

  const startReview = useCallback(
    (extra = false) => {
      if (!course || !progress) return;
      const ns = { queue: makeQueue(course, progress, phrases, extra, songs), done: 0, shown: false };
      setSession(ns);
      go('review');
      autoSay(ns);
    },
    [course, progress, phrases, songs, go, autoSay]
  );

  const setLang = useCallback(
    (l: string) => {
      s.setSetting('lang', l);
      setSession(null);
      go('home');
    },
    [s, go]
  );

  const ctx: AppCtx = {
    view,
    param,
    go,
    lang,
    course,
    progress,
    phrases,
    songs,
    dir,
    session,
    setSession,
    startReview,
    autoSay,
    speak,
    setLang,
    closeImport: () => setImportOpen(false),
  };

  const shown: View = importOpen ? 'import' : view === 'settings' ? 'settings' : !lang || view === 'lang' ? 'lang' : view;
  const Screen = {
    lang: LangPicker,
    home: Home,
    weeks: Weeks,
    week: WeekView,
    songs: Songs,
    song: SongView,
    review: Review,
    mine: Mine,
    method: Method,
    settings: Settings,
    import: ImportLocal,
  }[shown];
  const showNav = lang && shown !== 'lang' && shown !== 'import';

  return (
    <AppContext.Provider value={ctx}>
      <header>
        <h1>
          Ascolto <span>{course ? `· ${course.meta.name}` : 'em Família'}</span>
        </h1>
        <button className="spk" onClick={() => go('lang')} aria-label="Trocar idioma">
          {course ? course.meta.flag : '🌍'}
        </button>
        <button className="spk" onClick={() => go('settings')} aria-label="Configurações">
          ⚙️
        </button>
      </header>
      {s.saveError && <div className="banner">{s.saveError}</div>}
      <main>
        <Screen />
      </main>
      {showNav && (
        <nav>
          {TABS.map(([k, ic, l]) => (
            <button
              key={k}
              className={view === k || (k === 'weeks' && view === 'week') || (k === 'songs' && view === 'song') ? 'on' : ''}
              onClick={() => (k === 'review' ? startReview() : go(k))}
            >
              <b>{ic}</b>
              {l}
            </button>
          ))}
        </nav>
      )}
    </AppContext.Provider>
  );
}
