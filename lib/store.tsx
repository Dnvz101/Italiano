'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { blankProgress, today } from '@/lib/course';
import { setVoicePref } from '@/lib/voice';
import bundledIt from '@/content/it.json';
import bundledDe from '@/content/de.json';
import bundledJa from '@/content/ja.json';
import type { Course, FullLesson, Household, Lyric, LyricLine, Phrase, Profile, Progress, Song, SongAnalysis } from '@/lib/types';

export const OLD_KEY = 'ascolto-familia-v1';
export const importedKey = (uid: string) => 'ascolto-imported-v9:' + uid;

type Data = {
  userId: string;
  email: string;
  profile: Profile;
  household: Household | null;
  members: { id: string; name: string }[];
  courses: Record<string, Course>;
  progress: Record<string, Progress>;
  phrases: Phrase[];
  days: string[];
  lyrics: Record<string, Lyric>; // chave `${lang}:${song_key}`
  answers: Record<string, Record<string, string>>; // lyric_id → { texto da linha: tradução }
  songs: Song[]; // minhas músicas (e as da família)
};

type Store = Data & {
  updateProgress: (lang: string, fn: (p: Progress) => Progress) => void;
  markDay: () => void;
  addPhrase: (lang: string, text: string, meaning: string, note: string) => Promise<void>;
  deletePhrase: (id: string) => Promise<void>;
  saveLyrics: (lang: string, key: string, texts: string[]) => Promise<Lyric | null>;
  setLyricAi: (lyricId: string, ais: string[], kanas?: string[]) => Promise<void>;
  setLyricLesson: (lyricId: string, lesson: FullLesson) => Promise<void>;
  setAnswer: (lyricId: string, line: string, value: string) => void;
  setName: (name: string) => Promise<void>;
  setSetting: (k: keyof Profile['settings'], v: any) => void;
  setHouseholdName: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  resetCourse: (lang: string) => void;
  importLocal: (index: number) => Promise<void>;
  addSong: (
    lang: string,
    info: { title: string; artist: string; duration_sec: number | null; level: number; analysis: SongAnalysis },
    lines: string[]
  ) => Promise<string | null>;
  deleteSong: (id: string) => Promise<void>;
  toggleSongStudy: (lang: string, id: string) => void;
  signOut: () => Promise<void>;
  saveError: string | null;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
};

const lkey = (lang: string, key: string) => `${lang}:${key}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const sb = useMemo(() => (typeof window === 'undefined' ? (null as any) : createClient()), []);
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef<Data | null>(null);
  const pending = useRef<Record<string, { timer: any; run: () => Promise<void> }>>({});

  const commit = useCallback((fn: (d: Data) => Data) => {
    if (!latest.current) return;
    latest.current = fn(latest.current);
    setData(latest.current);
  }, []);

  const report = (error: any) => {
    if (error) {
      console.error(error);
      setSaveError('Não foi possível salvar. Verifique a internet.');
    } else setSaveError(null);
  };

  // Salvamento com atraso (agrupa várias mudanças seguidas num envio só)
  const debounce = useCallback((key: string, run: () => Promise<void>, ms = 700) => {
    const p = pending.current[key];
    if (p) clearTimeout(p.timer);
    const timer = setTimeout(async () => {
      delete pending.current[key];
      await run();
    }, ms);
    pending.current[key] = { timer, run };
  }, []);

  const flush = useCallback(() => {
    Object.entries(pending.current).forEach(([k, p]) => {
      clearTimeout(p.timer);
      delete pending.current[k];
      p.run();
    });
  }, []);

  useEffect(() => {
    const h = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', h);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', h);
      window.removeEventListener('pagehide', flush);
    };
  }, [flush]);

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      let { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!prof) {
        await sb.rpc('ensure_profile');
        ({ data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle());
      }
      if (!prof) throw new Error('Perfil não encontrado. O schema do banco foi aplicado?');

      const [courses, weeks, prog, days, phrases, lyrics, answers, songs, house, members] = await Promise.all([
        sb.from('courses').select('*').order('sort'),
        sb.from('course_weeks').select('*').order('n'),
        sb.from('course_progress').select('*'),
        sb.from('activity_days').select('day').order('day', { ascending: false }).limit(400),
        sb.from('user_phrases').select('*').order('created_at'),
        sb.from('lyrics').select('*'),
        sb.from('lyric_answers').select('*'),
        sb.from('user_songs').select('*').order('created_at', { ascending: false }),
        prof.household_id
          ? sb.from('households').select('*').eq('id', prof.household_id).maybeSingle()
          : Promise.resolve({ data: null }),
        prof.household_id
          ? sb.from('profiles').select('id,name').eq('household_id', prof.household_id).order('name')
          : Promise.resolve({ data: [] }),
      ]);
      const firstErr = [courses, weeks, prog, days, phrases, lyrics, answers, songs].find((r: any) => r.error);
      if (firstErr) throw (firstErr as any).error;

      // Conteúdo: do banco; se o seed ainda não foi rodado, usa o conteúdo embutido
      const cs: Record<string, Course> = {};
      if (courses.data?.length) {
        courses.data.forEach((c: any) => {
          cs[c.lang] = { lang: c.lang, sort: c.sort, meta: c.meta, weeks: [] };
        });
        weeks.data?.forEach((w: any) => cs[w.lang]?.weeks.push(w.data));
      }
      // idioma novo que ainda não está no banco (seed não rodado): usa o conteúdo embutido no app
      [bundledIt, bundledDe, bundledJa].forEach((c: any) => {
        if (!cs[c.lang] || !cs[c.lang].weeks.length) cs[c.lang] = c as Course;
      });

      const progress: Record<string, Progress> = {};
      Object.keys(cs).forEach((l) => (progress[l] = blankProgress()));
      prog.data?.forEach((p: any) => {
        progress[p.lang] = {
          started: p.started?.length ? p.started : [1],
          songs: p.songs || [],
          checks: p.checks || {},
          srs: p.srs || {},
          imm: p.imm || {},
        };
      });

      const ly: Record<string, Lyric> = {};
      lyrics.data?.forEach((l: any) => (ly[lkey(l.lang, l.song_key)] = l));
      const ans: Record<string, Record<string, string>> = {};
      answers.data?.forEach((a: any) => (ans[a.lyric_id] = a.answers || {}));

      const d: Data = {
        userId: user.id,
        email: user.email || '',
        profile: { ...prof, settings: prof.settings || {} },
        household: (house as any).data || null,
        members: (members as any).data || [],
        courses: cs,
        progress,
        phrases: phrases.data || [],
        days: (days.data || []).map((x: any) => x.day),
        lyrics: ly,
        answers: ans,
        songs: songs.data || [],
      };
      latest.current = d;
      setData(d);
      setLoadError(null);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || 'Erro ao carregar.');
    }
  }, [sb]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- AÇÕES ----------

  const saveProgress = useCallback(
    (lang: string) =>
      debounce('p:' + lang, async () => {
        const d = latest.current;
        if (!d) return;
        const p = d.progress[lang];
        const { error } = await sb.from('course_progress').upsert({
          user_id: d.userId,
          lang,
          started: p.started,
          songs: p.songs || [],
          checks: p.checks,
          srs: p.srs,
          imm: p.imm,
          updated_at: new Date().toISOString(),
        });
        report(error);
      }),
    [sb, debounce]
  );

  const updateProgress = useCallback(
    (lang: string, fn: (p: Progress) => Progress) => {
      commit((d) => ({ ...d, progress: { ...d.progress, [lang]: fn(d.progress[lang] || blankProgress()) } }));
      saveProgress(lang);
    },
    [commit, saveProgress]
  );

  const markDay = useCallback(() => {
    const d = latest.current;
    const t = today();
    if (!d || d.days.includes(t)) return;
    commit((x) => ({ ...x, days: [t, ...x.days] }));
    sb.from('activity_days')
      .upsert({ user_id: d.userId, day: t }, { ignoreDuplicates: true })
      .then(({ error }) => report(error));
  }, [sb, commit]);

  const addPhrase = useCallback(
    async (lang: string, text: string, meaning: string, note: string) => {
      const d = latest.current!;
      const { data: row, error } = await sb
        .from('user_phrases')
        .insert({ user_id: d.userId, lang, text, meaning, note })
        .select()
        .single();
      report(error);
      if (row) commit((x) => ({ ...x, phrases: [...x.phrases, row] }));
      markDay();
    },
    [sb, commit, markDay]
  );

  const deletePhrase = useCallback(
    async (id: string) => {
      const ph = latest.current!.phrases.find((p) => p.id === id);
      const { error } = await sb.from('user_phrases').delete().eq('id', id);
      report(error);
      if (error) return;
      commit((x) => ({ ...x, phrases: x.phrases.filter((p) => p.id !== id) }));
      if (ph)
        updateProgress(ph.lang, (p) => {
          const srs = { ...p.srs };
          delete srs['m-' + id];
          return { ...p, srs };
        });
    },
    [sb, commit, updateProgress]
  );

  const saveLyrics = useCallback(
    async (lang: string, key: string, texts: string[]) => {
      const d = latest.current!;
      const old = d.lyrics[lkey(lang, key)];
      if (!texts.length) {
        if (old) {
          const { error } = await sb.from('lyrics').delete().eq('id', old.id);
          report(error);
          if (!error)
            commit((x) => {
              const lyrics = { ...x.lyrics };
              delete lyrics[lkey(lang, key)];
              return { ...x, lyrics };
            });
        }
        return null;
      }
      const lines: LyricLine[] = texts.map((t) => {
        const o = old?.lines.find((x) => x.t === t && x.ai);
        return o?.kana ? { t, ai: o.ai, kana: o.kana } : { t, ai: o?.ai || '' };
      });
      if (!d.profile.household_id) {
        setSaveError('Sem família configurada.');
        return null;
      }
      const { data: row, error } = await sb
        .from('lyrics')
        .upsert(
          { household_id: d.profile.household_id, lang, song_key: key, lines, updated_at: new Date().toISOString() },
          { onConflict: 'household_id,lang,song_key' }
        )
        .select()
        .single();
      report(error);
      if (row) commit((x) => ({ ...x, lyrics: { ...x.lyrics, [lkey(lang, key)]: row } }));
      return (row as Lyric) || null;
    },
    [sb, commit]
  );

  const setLyricAi = useCallback(
    async (lyricId: string, ais: string[], kanas?: string[]) => {
      const d = latest.current!;
      const entry = Object.entries(d.lyrics).find(([, l]) => l.id === lyricId);
      if (!entry) return;
      const [k, l] = entry;
      const lines = l.lines.map((ln, i) => ({ ...ln, ai: ais[i] ?? ln.ai, ...(kanas?.[i] ? { kana: kanas[i] } : {}) }));
      commit((x) => ({ ...x, lyrics: { ...x.lyrics, [k]: { ...l, lines } } }));
      const { error } = await sb.from('lyrics').update({ lines, updated_at: new Date().toISOString() }).eq('id', lyricId);
      report(error);
    },
    [sb, commit]
  );

  const setLyricLesson = useCallback(
    async (lyricId: string, lesson: FullLesson) => {
      const d = latest.current!;
      const entry = Object.entries(d.lyrics).find(([, l]) => l.id === lyricId);
      if (!entry) return;
      const [k, l] = entry;
      commit((x) => ({ ...x, lyrics: { ...x.lyrics, [k]: { ...l, lesson } } }));
      const { error } = await sb.from('lyrics').update({ lesson }).eq('id', lyricId);
      report(error);
    },
    [sb, commit]
  );

  const setAnswer = useCallback(
    (lyricId: string, line: string, value: string) => {
      commit((x) => ({ ...x, answers: { ...x.answers, [lyricId]: { ...(x.answers[lyricId] || {}), [line]: value } } }));
      debounce('a:' + lyricId, async () => {
        const d = latest.current!;
        const { error } = await sb.from('lyric_answers').upsert({
          user_id: d.userId,
          lyric_id: lyricId,
          answers: d.answers[lyricId] || {},
          updated_at: new Date().toISOString(),
        });
        report(error);
      });
    },
    [sb, commit, debounce]
  );

  const setName = useCallback(
    async (name: string) => {
      const d = latest.current!;
      commit((x) => ({
        ...x,
        profile: { ...x.profile, name },
        members: x.members.map((m) => (m.id === x.userId ? { ...m, name } : m)),
      }));
      const { error } = await sb.from('profiles').update({ name }).eq('id', d.userId);
      report(error);
    },
    [sb, commit]
  );

  const setSetting = useCallback(
    (k: keyof Profile['settings'], v: any) => {
      commit((x) => ({ ...x, profile: { ...x.profile, settings: { ...x.profile.settings, [k]: v } } }));
      debounce('settings', async () => {
        const d = latest.current!;
        const { error } = await sb.from('profiles').update({ settings: d.profile.settings }).eq('id', d.userId);
        report(error);
      }, 300);
    },
    [sb, commit, debounce]
  );

  const setHouseholdName = useCallback(
    async (name: string) => {
      const d = latest.current!;
      if (!d.household) return;
      commit((x) => ({ ...x, household: { ...x.household!, name } }));
      const { error } = await sb.from('households').update({ name }).eq('id', d.household.id);
      report(error);
    },
    [sb, commit]
  );

  const joinHousehold = useCallback(
    async (code: string) => {
      flush();
      const { error } = await sb.rpc('join_household', { code });
      if (error) throw new Error(error.message.includes('inválido') ? 'Código de família inválido.' : error.message);
      await load();
    },
    [sb, load, flush]
  );

  const resetCourse = useCallback(
    (lang: string) => updateProgress(lang, () => blankProgress()),
    [updateProgress]
  );

  // Importa o progresso salvo no aparelho pelas versões v1–v8
  const importLocal = useCallback(
    async (index: number) => {
      const d = latest.current!;
      let raw: any;
      try {
        raw = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
      } catch {}
      if (!raw?.profiles?.[index]) return;
      const op = raw.profiles[index];
      const cs: Record<string, any> = op.c || {
        it: { started: op.started, checks: op.checks, srs: op.srs, mine: op.mine, imm: op.imm },
      };

      for (const lang of Object.keys(cs)) {
        if (!d.courses[lang]) continue;
        const old = cs[lang] || {};
        const srs: Record<string, any> = { ...(old.srs || {}) };
        // frases próprias ganham id novo; as chaves da revisão espaçada acompanham
        for (const m of old.mine || []) {
          const existing = latest.current!.phrases.find((x) => x.lang === lang && x.text === m.it);
          if (existing) {
            if (srs['m-' + m.id]) srs['m-' + existing.id] = srs['m-' + m.id];
            delete srs['m-' + m.id];
            continue;
          }
          const { data: row } = await sb
            .from('user_phrases')
            .insert({ user_id: d.userId, lang, text: m.it, meaning: m.pt, note: m.note || '' })
            .select()
            .single();
          if (row) {
            if (srs['m-' + m.id]) {
              srs['m-' + row.id] = srs['m-' + m.id];
            }
            commit((x) => ({ ...x, phrases: [...x.phrases, row] }));
          }
          delete srs['m-' + m.id];
        }
        const cur = latest.current!.progress[lang] || blankProgress();
        const merged: Progress = {
          started: Array.from(new Set([...(old.started || [1]), ...cur.started])).sort((a, b) => a - b),
          songs: cur.songs || [],
          checks: { ...(old.checks || {}), ...cur.checks },
          srs: { ...srs, ...cur.srs },
          imm: { ...(old.imm || {}), ...cur.imm },
        };
        commit((x) => ({ ...x, progress: { ...x.progress, [lang]: merged } }));
        const { error } = await sb.from('course_progress').upsert({ user_id: d.userId, lang, ...merged, updated_at: new Date().toISOString() });
        report(error);

        // letras (v7/v8): vão para a família; as traduções digitadas viram respostas suas
        const lyr = raw.lyrics?.[lang] || {};
        for (const n of Object.keys(lyr)) {
          const lines = (lyr[n]?.lines || []) as { t: string; tr?: string; ai?: string }[];
          if (!lines.length) continue;
          const key = 'w' + n;
          let target = latest.current!.lyrics[lkey(lang, key)];
          if (!target) {
            await saveLyrics(lang, key, lines.map((l) => l.t));
            target = latest.current!.lyrics[lkey(lang, key)];
            if (target && lines.some((l) => l.ai)) await setLyricAi(target.id, target.lines.map((tl) => lines.find((l) => l.t === tl.t)?.ai || ''));
          }
          if (target) lines.filter((l) => l.tr).forEach((l) => setAnswer(target.id, l.t, l.tr!));
        }
      }

      const days: string[] = op.days || [];
      if (days.length) {
        const { error } = await sb
          .from('activity_days')
          .upsert(days.map((day) => ({ user_id: d.userId, day })), { ignoreDuplicates: true });
        report(error);
        commit((x) => ({ ...x, days: Array.from(new Set([...x.days, ...days])).sort().reverse() }));
      }
      if (raw.dir) setSetting('dir', raw.dir);
      if (raw.lang && d.courses[raw.lang]) setSetting('lang', raw.lang);
      if (raw.voice && typeof raw.voice === 'object') Object.entries(raw.voice).forEach(([l, u]) => setVoicePref(l, u as string));
      if (typeof raw.voice === 'string') setVoicePref('it', raw.voice);
      if (op.name && /@|^[a-z0-9._-]+$/i.test(d.profile.name)) await setName(op.name);
      try {
        localStorage.setItem(importedKey(d.userId), '1');
      } catch {}
      flush();
    },
    [sb, commit, saveLyrics, setLyricAi, setAnswer, setSetting, setName, flush]
  );

  const addSong = useCallback(
    async (
      lang: string,
      info: { title: string; artist: string; duration_sec: number | null; level: number; analysis: SongAnalysis },
      lines: string[]
    ) => {
      const d = latest.current!;
      const { data: row, error } = await sb
        .from('user_songs')
        .insert({ user_id: d.userId, household_id: d.profile.household_id, lang, ...info })
        .select()
        .single();
      report(error);
      if (!row) return null;
      commit((x) => ({ ...x, songs: [row, ...x.songs] }));
      await saveLyrics(lang, 'song:' + row.id, lines);
      return row.id as string;
    },
    [sb, commit, saveLyrics]
  );

  const toggleSongStudy = useCallback(
    (lang: string, id: string) => {
      updateProgress(lang, (p) => {
        const has = (p.songs || []).includes(id);
        return { ...p, songs: has ? p.songs.filter((x) => x !== id) : [...(p.songs || []), id] };
      });
      markDay();
    },
    [updateProgress, markDay]
  );

  const deleteSong = useCallback(
    async (id: string) => {
      const song = latest.current!.songs.find((x) => x.id === id);
      if (!song) return;
      const { error } = await sb.from('user_songs').delete().eq('id', id);
      report(error);
      if (error) return;
      await saveLyrics(song.lang, 'song:' + id, []);
      commit((x) => ({ ...x, songs: x.songs.filter((s) => s.id !== id) }));
      updateProgress(song.lang, (p) => {
        const srs = { ...p.srs };
        Object.keys(srs).forEach((k) => k.startsWith(`s:${id}-`) && delete srs[k]);
        const checks = { ...p.checks };
        delete checks['s:' + id];
        return { ...p, songs: (p.songs || []).filter((x) => x !== id), srs, checks };
      });
    },
    [sb, commit, saveLyrics, updateProgress]
  );

  const signOut = useCallback(async () => {
    flush();
    await sb.auth.signOut();
    window.location.href = '/login';
  }, [sb, flush]);

  if (loadError)
    return (
      <main>
        <div className="card">
          <h3>Não foi possível carregar</h3>
          <p className="mut">{loadError}</p>
          <button className="btn" onClick={() => load()}>
            Tentar de novo
          </button>
        </div>
      </main>
    );
  if (!data)
    return (
      <main>
        <p className="mut" style={{ textAlign: 'center', marginTop: 80 }}>
          Carregando…
        </p>
      </main>
    );

  const value: Store = {
    ...data,
    updateProgress,
    markDay,
    addPhrase,
    deletePhrase,
    saveLyrics,
    setLyricAi,
    setLyricLesson,
    setAnswer,
    setName,
    setSetting,
    setHouseholdName,
    joinHousehold,
    resetCourse,
    importLocal,
    addSong,
    deleteSong,
    toggleSongStudy,
    signOut,
    saveError,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
