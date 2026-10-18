'use client';
import { useApp } from '@/lib/nav';

export default function Spk({ text, slow = false }: { text: string; slow?: boolean }) {
  const { speak } = useApp();
  return (
    <button
      className={`spk ${slow ? 'slow' : ''}`}
      aria-label={slow ? 'Ouvir devagar' : 'Ouvir'}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, slow ? 0.6 : undefined);
      }}
    >
      {slow ? '🐢' : '🔊'}
    </button>
  );
}
