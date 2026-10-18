'use client';
import { useEffect, useRef, useState } from 'react';

// Vídeos de boas-vindas por idioma (public/media). Quem não tem vídeo mostra só o título.
const HERO: Record<string, { video: string; poster: string }> = {
  it: { video: '/media/hero-it.mp4', poster: '/media/hero-it.webp' },
};

/** "Ciao, Leandro!" dentro do balão de fala do vídeo animado da turma (pizza, vespa e moka). */
export default function HeroGreeting({ lang, hello, name }: { lang: string; hello: string; name: string }) {
  const hero = HERO[lang];
  const ref = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const f = () => setStill(mq.matches);
    f();
    mq.addEventListener?.('change', f);
    return () => mq.removeEventListener?.('change', f);
  }, []);

  // economiza bateria: pausa quando o cartão sai da tela ou o app vai para o fundo
  useEffect(() => {
    const v = ref.current;
    if (!v || still) return;
    const play = () => v.play().catch(() => {});
    const io = new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? play() : v.pause()), {
      threshold: 0.2,
    });
    io.observe(v);
    const vis = () => (document.hidden ? v.pause() : play());
    document.addEventListener('visibilitychange', vis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, [still, hero]);

  const raw = (name || '').trim().split(/\s+/)[0] || '';
  const first = raw.charAt(0).toUpperCase() + raw.slice(1);
  if (!hero)
    return (
      <h2>
        {hello}, {first}! 👋
      </h2>
    );

  const long = first.length > 8;
  return (
    <div className="hero">
      {still ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hero.poster} alt="" className="hero-media" />
      ) : (
        <video
          ref={ref}
          className="hero-media"
          src={hero.video}
          poster={hero.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          disablePictureInPicture
        />
      )}
      <h2 className={`hero-bubble ${long ? 'long' : ''}`}>
        <span>{hello},</span>
        <b>{first}!</b>
      </h2>
    </div>
  );
}
