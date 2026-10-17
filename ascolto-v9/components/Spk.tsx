'use client';
import { useApp } from '@/lib/nav';

export default function Spk({ text }: { text: string }) {
  const { speak } = useApp();
  return (
    <button
      className="spk"
      aria-label="Ouvir"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
    >
      🔊
    </button>
  );
}
