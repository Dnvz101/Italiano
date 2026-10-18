'use client';
import { useEffect, useRef, useState } from 'react';

// Vídeos de boas-vindas por idioma (public/media). Quem não tem vídeo mostra só o título.
const HERO: Record<string, { video: string; poster: string; end: string }> = {
  it: { video: '/media/hero-it.mp4', poster: '/media/hero-it.webp', end: '/media/hero-it-end.webp' },
};
const SEEN = 'ascolto-hero-seen';

/**
 * "Ciao, Leandro!" dentro do balão de fala do vídeo da turma (pizza, vespa e moka).
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
      <h2 className={`hero-bubble ${long ? 'long' : ''}`} aria-hidden="true">
        <span>{hello},</span>
        <b>{first}!</b>
      </h2>
    </div>
  );
}
