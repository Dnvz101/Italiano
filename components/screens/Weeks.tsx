'use client';
import { useAccess } from '../Paywall';
import { banner } from '@/lib/langs';
import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { useCourse } from '@/lib/nav';
import { currentWeek } from '@/lib/course';
import { LEVELS, songFit, userLevel } from '@/lib/level';
import { currentModuleKey, isComplete, loadOpen, modules, saveOpen, weekDone } from '@/lib/modules';
import Disc, { Eq } from '../Disc';

export default function Weeks() {
  const s = useStore();
  const { lang, course, progress: p, songs, go, param } = useCourse();
  const acc = useAccess();
  const mods = modules(course);
  const cur = currentWeek(p);
  const level = userLevel(course, p, s.profile.settings.level?.[lang]);

  const [open, setOpen] = useState<string[]>([]);
  useEffect(() => {
    const saved = loadOpen(lang);
    const want = param?.open as string | undefined;
    const base = saved ?? [currentModuleKey(course, p), 'fav'];
    setOpen(want && !base.includes(want) ? [...base, want] : base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, param]);
  const toggle = (k: string) => {
    const next = open.includes(k) ? open.filter((x) => x !== k) : [...open, k];
    setOpen(next);
    saveOpen(lang, next);
  };

  const mine = songs.filter((x) => x.user_id === s.userId);
  const family = songs.filter((x) => x.user_id !== s.userId);
  const studying = (id: string) => (p.songs || []).includes(id);

  const SongRow = ({ song }: { song: (typeof songs)[number] }) => {
    const f = songFit(song.level, level);
    const d = (p.checks['s:' + song.id] || []).filter(Boolean).length;
    const owner = s.members.find((m) => m.id === song.user_id)?.name;
    return (
      <button className="track" onClick={() => go('song', song.id)}>
        <span className="track-n" aria-label={f.title}>
          {f.emoji}
        </span>
        <span className="track-t">
          <b>{song.title}</b>
          <span className="mut">
            {song.artist}
            {owner && song.user_id !== s.userId ? `, de ${owner}` : ''}
          </span>
        </span>
        <span className="track-s mut">
          {d === 7 ? '✓' : studying(song.id) ? `${d}/7` : LEVELS[song.level]}
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="page-banner" style={{ aspectRatio: '1207/389' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner(lang, 'trilha')} alt="" />
        <div className="pb-text">
          <h2>Trilha</h2>
          <p>Uma música por semana, da mais lenta à mais rápida.</p>
        </div>
      </div>
      <p className="mut lead">Suas favoritas ficam num álbum à parte, no fim da lista.</p>

      {mods.map((m, mi) => {
        const done = m.weeks.filter((w) => isComplete(p, w.n)).length;
        const first = m.weeks[0];
        const last = m.weeks[m.weeks.length - 1];
        return (
          <Disc
            key={m.key}
            id={m.key}
            open={open.includes(m.key)}
            onToggle={() => toggle(m.key)}
            title={mods.length > 1 ? `Módulo ${mi + 1}: ${m.name}` : m.name}
            subtitle={`Semanas ${first.n} a ${last.n}, ${done} de ${m.weeks.length} concluídas`}
            done={done}
            total={m.weeks.length}
          >
            {m.weeks.map((w) => {
              const d = weekDone(p, w.n);
              const started = p.started.includes(w.n);
              const now = w.n === cur && d < 7;
              const locked = acc.weekLocked(w.n, course.weeks);
              return (
                <button key={w.n} className={`track ${now ? 'now' : ''} ${d === 7 ? 'done' : ''} ${locked ? 'locked' : ''}`} onClick={() => go('week', w.n)}>
                  <span className="track-n">{locked ? '🔒' : now ? <Eq /> : d === 7 ? '✓' : w.n}</span>
                  <span className="track-t">
                    <b>{w.title}</b>
                    <span className="mut">
                      {w.artist}
                      {w.year ? `, ${w.year}` : ''}
                    </span>
                  </span>
                  <span className="track-s">
                    <span className={`lvl l${w.lv}`}>{w.level}</span>
                    <span className="mut">{d === 7 ? 'concluída' : started ? `${d}/7 dias` : ''}</span>
                  </span>
                </button>
              );
            })}
          </Disc>
        );
      })}

      <Disc
        id="fav"
        tone="fav"
        open={open.includes('fav')}
        onToggle={() => toggle('fav')}
        title="Minhas favoritas"
        subtitle={
          mine.length
            ? `${mine.length} ${mine.length === 1 ? 'música' : 'músicas'} que você trouxe`
            : 'As músicas que você ama, no seu nível'
        }
        done={mine.filter((x) => (p.checks['s:' + x.id] || []).filter(Boolean).length === 7).length}
        total={mine.length}
      >
        {mine.map((x) => (
          <SongRow key={x.id} song={x} />
        ))}
        <button className="track add" onClick={() => go('songs')}>
          <span className="track-n">+</span>
          <span className="track-t">
            <b>Adicionar uma música que eu amo</b>
            <span className="mut">A IA mede o nível e monta a aula</span>
          </span>
        </button>
        {family.length > 0 && (
          <>
            <p className="disc-sub mut">Da família</p>
            {family.map((x) => (
              <SongRow key={x.id} song={x} />
            ))}
          </>
        )}
      </Disc>
    </>
  );
}
