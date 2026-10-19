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
import Chat from './screens/Chat';
import Mine from './screens/Mine';
import Method from './screens/Method';
import Settings from './screens/Settings';
import ImportLocal from './screens/ImportLocal';
import Taste from './screens/Taste';
import Explore from './screens/Explore';
import Admin from './screens/Admin';
import { kanaPending } from './KanaPractice';
import Icon, { type IconName } from './Icon';
import Line from './Line';
import { Flag } from './icons';

const TABS: [View, IconName, string][] = [
  ['home', 'home', 'Início'],
  ['weeks', 'trilha', 'Trilha'],
  ['chat', 'conversa', 'Conversa'],
  ['review', 'cards', 'Cards'],
  ['mine', 'frases', 'Frases'],
  ['method', 'metodo', 'Método'],
];
// a aba "Trilha" também cobre semanas, favoritas e músicas
const tabOf = (v: View): View => (v === 'week' || v === 'songs' || v === 'song' ? 'weeks' : v === 'taste' || v === 'explore' ? 'home' : v);

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

  // cada idioma pode ter sua paleta (o japonês é vermelho, preto e branco)
  useEffect(() => {
    document.documentElement.dataset.lang = lang || '';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', lang === 'ja' ? '#fbfaf8' : '#f7faf9');
  }, [lang]);

  const go = useCallback((v: View, p: any = null) => {
    setView(v);
    setParam(p);
    window.scrollTo(0, 0);
  }, []);

  const speak = useCallback(
    (text: string, rate?: number, onEnd?: () => void) => {
      if (course) say(text, course.meta.lang, course.meta.locale, rate, onEnd);
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

  const shown: View = importOpen
    ? 'import'
    : view === 'settings'
      ? 'settings'
      : view === 'admin' && s.isAdmin
        ? 'admin'
        : !lang || view === 'lang'
          ? 'lang'
          : view === 'admin'
            ? 'home'
            : view;
  const Screen = {
    lang: LangPicker,
    home: Home,
    weeks: Weeks,
    week: WeekView,
    songs: Songs,
    song: SongView,
    chat: Chat,
    review: Review,
    mine: Mine,
    method: Method,
    settings: Settings,
    import: ImportLocal,
    taste: Taste,
    explore: Explore,
    admin: Admin,
  }[shown];
  const showNav = lang && shown !== 'lang' && shown !== 'import';

  const active = tabOf(shown);
  const kanaDot = kanaPending(course, progress);
  const tabButtons = TABS.map(([k, ic, l]) => (
    <button
      key={k}
      className={active === k ? 'on' : ''}
      aria-current={active === k ? 'page' : undefined}
      onClick={() => (k === 'review' ? startReview() : go(k))}
    >
      <Icon name={ic} size={28} className="nav-ic" />
      {k === 'review' && kanaDot > 0 && <i className="tab-dot" aria-label="treino de kana pendente" />}
      <span>{l}</span>
    </button>
  ));

  return (
    <AppContext.Provider value={ctx}>
      <div className={`shell ${showNav ? 'with-nav' : ''}`}>
        {showNav && (
          <aside className="side" aria-label="Menu">
            <div className="brand">
              Ascolto
              <span>em Família</span>
            </div>
            <nav className="side-nav">{tabButtons}</nav>
            <div className="side-foot">
              <button className="side-lang" onClick={() => go('lang')}>
                <b aria-hidden="true">{course?.meta.flag}</b> {course?.meta.name}
                <span className="mut">trocar</span>
              </button>
              <button className={`side-set ${shown === 'settings' ? 'on' : ''}`} onClick={() => go('settings')}>
                <Icon name="ajustes" size={22} /> Ajustes
              </button>
            </div>
          </aside>
        )}
        <div className="content">
          <header className="topbar">
            <h1>
              <button className="brand-home" onClick={() => go('home')} aria-label="Início">
                <Line name="home" size={30} stroke={2.6} />
              </button>
              Ascolto <span>{course ? course.meta.name : 'em Família'}</span>
            </h1>
            <button className="top-pill" onClick={() => go('lang')} aria-label="Trocar idioma">
              {course ? <Flag lang={course.meta.lang} /> : '🌍'}
            </button>
            <button className="top-round" onClick={() => go('settings')} aria-label="Configurações">
              <Line name="gear" size={22} stroke={2.2} />
            </button>
          </header>
          {s.saveError && <div className="banner">{s.saveError}</div>}
          <main>
            <Screen />
          </main>
        </div>
        {showNav && <nav className="tabbar">{tabButtons}</nav>}
      </div>
    </AppContext.Provider>
  );
}
