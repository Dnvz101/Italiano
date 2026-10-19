'use client';
import { useEffect, useRef, useState } from 'react';

// Vídeos de boas-vindas por idioma (public/media). Quem não tem vídeo mostra só o título.
// bubble: onde fica o balão de fala no vídeo (em % do cartão), para o "Ciao/Hallo" cair dentro dele.
type Bubble = { left: number; top: number; w: number; h: number };
type Hero =
  | { kind: 'image'; image: string; ratio: string; bubble: Bubble }
  | { kind: 'video'; video: string; poster: string; end: string; bubble: Bubble };
const HERO: Record<string, Hero> = {
  // pizza de chef, Vespa e cafeteira moka
  // banner estático: pizza de chef, Vespa e moka diante do Coliseu
  it: { kind: 'image', image: '/media/banner-it.webp', ratio: '949/317', bubble: { left: 73.7, top: 2, w: 17.3, h: 32.8 } },
  // onigiri de fone, disco, monte Fuji e torii (desenho próprio, scripts/ja-art.py)
  ja: { kind: 'image', image: '/media/ja-hero.webp', ratio: '1200/400', bubble: { left: 73.3, top: 4.5, w: 23.3, h: 33 } },
  // pretzel, caneca de chopp e salsicha
  de: {
    kind: 'video',
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
    if (!hero || hero.kind !== 'video') return;
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

  const long = first.length > 7;
  const bubble = (
    <h2
      className={`hero-bubble ${long ? 'long' : ''} ${lang === 'ja' ? 'ja' : ''}`}
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
  );
  if (hero.kind === 'image')
    return (
      <div className="hero hero-static" style={{ aspectRatio: hero.ratio }} role="img" aria-label={`${hello}, ${first}!`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero.image} alt="" className="hero-media" />
        {bubble}
      </div>
    );
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
