'use client';
import { useEffect, useRef, useState } from 'react';

// Vídeos de boas-vindas por idioma (public/media). Quem não tem vídeo mostra só o título.
// bubble: onde fica o balão de fala no vídeo (em % do cartão), para o "Ciao/Hallo" cair dentro dele.
type Hero = { video: string; poster: string; end: string; bubble: { left: number; top: number; w: number; h: number } };
const HERO: Record<string, Hero> = {
  // pizza de chef, Vespa e cafeteira moka
  it: {
    video: '/media/hero-it.mp4',
    poster: '/media/hero-it.webp',
    end: '/media/hero-it-end.webp',
    bubble: { left: 76.2, top: 5.5, w: 20.6, h: 33 },
  },
  // pretzel, caneca de chopp e salsicha
  de: {
    video: '/media/hero-de.mp4',
    poster: '/media/hero-de.webp',
    end: '/media/hero-de-end.webp',
    bubble: { left: 77, top: 7, w: 19.7, h: 32.4 },
  },
};
const SEEN = 'ascolto-hero-seen';

/**
 * "Ciao, Leandro!" / "Hallo, Leandro!" dentro do balão de fala do vídeo de cada idioma.
 * Toca sozinho uma vez quando o app abre; depois fica parado no último quadro. Tocar no cartão repete.
 */
export default function HeroGreeting({ lang, hello, name }: { lang: string; hello: string; name: string }) {
  const hero = HERO[lang];
  const ref = useRef<HTMLVideoElement>(null);
  // 'play': vídeo tocando; 'still': imagem parada (já viu, celular bloqueou ou "reduzir movimento")
  const [mode, setMode] = useState<'play' | 'still'>('still');

  useEffect(() => {
    if (!hero) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN + lang) === '1';
    } catch {}
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!seen && !reduce) setMode('play');
  }, [hero, lang]);

  useEffect(() => {
    const v = ref.current;
    if (mode !== 'play' || !v) return;
    // o React não escreve o atributo "muted" no HTML; sem ele o iPhone recusa o autoplay
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.currentTime = 0;
    v.play()
      .then(() => {
        try {
          sessionStorage.setItem(SEEN + lang, '1');
        } catch {}
      })
      // modo economia de bateria e afins bloqueiam vídeo automático: mostra a imagem, sem botão de play
      .catch(() => setMode('still'));
  }, [mode, lang]);

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
    <div
      className="hero"
      onClick={() => mode === 'still' && setMode('play')}
      role="img"
      aria-label={`${hello}, ${first}!`}
    >
      {/* base: último quadro (já carregado quando o vídeo termina, sem piscar) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hero.end} alt="" className="hero-media" />
      {mode === 'play' && (
        <video
          ref={ref}
          className="hero-media"
          src={hero.video}
          poster={hero.poster}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          controls={false}
          onEnded={() => setMode('still')}
        />
      )}
      <h2
        className={`hero-bubble ${long ? 'long' : ''}`}
        aria-hidden="true"
        style={{
          left: `${hero.bubble.left}%`,
          top: `${hero.bubble.top}%`,
          width: `${hero.bubble.w}%`,
          height: `${hero.bubble.h}%`,
        }}
      >
        <span>{hello},</span>
        <b>{first}!</b>
      </h2>
    </div>
  );
}
