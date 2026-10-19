'use client';
import { useEffect, useState } from 'react';
import { plain } from './kana';

// A voz é uma preferência do APARELHO (cada celular tem vozes diferentes), por isso fica no localStorage.
const KEY = 'ascolto-voice';

function prefs(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}
export function setVoicePref(lang: string, uri: string) {
  const p = prefs();
  p[lang] = uri;
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

function score(v: SpeechSynthesisVoice) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (/natural|neural|online/.test(n)) s += 50;
  if (/premium|enhanced|aprimorad|migliorat|erweitert/.test(n)) s += 40;
  if (/google/.test(n)) s += 30;
  if (/alice|federica|luca|elsa|isabella|diego|paola|emma|giuseppe|anna|petra|markus|yannick|helena|katja|conrad|amala|seraphina|florian|kyoko|otoya|nanami|keita|aoi|daichi|mayu|naoki|shiori|o-ren|hattori/.test(n)) s += 10;
  if (!v.localService) s += 5;
  if (/espeak|compact|robot/.test(n)) s -= 60;
  return s;
}

const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  if (!hasTTS()) return [];
  const re = new RegExp('^' + lang, 'i');
  return speechSynthesis
    .getVoices()
    .filter((v) => re.test(v.lang))
    .sort((a, b) => score(b) - score(a));
}

export function currentVoice(lang: string) {
  const vs = voicesFor(lang);
  const p = prefs()[lang];
  return (p && vs.find((v) => v.voiceURI === p)) || vs[0] || null;
}

export function say(text: string, lang: string, locale: string, rate = 0.88, onEnd?: () => void) {
  if (!hasTTS()) {
    if (onEnd) onEnd();
    else alert('Seu navegador não tem leitura em voz alta.');
    return;
  }
  speechSynthesis.cancel();
  text = plain(text);
  const u = new SpeechSynthesisUtterance(text);
  const v = currentVoice(lang);
  u.lang = v ? v.lang : locale;
  if (v) u.voice = v;
  u.rate = rate;
  if (onEnd) {
    // alguns navegadores esquecem o onend: um relógio de segurança garante que o fluxo continua
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      onEnd();
    };
    const t = setTimeout(fin, 1500 + (text.length * 95) / rate);
    u.onend = fin;
    u.onerror = fin;
  }
  speechSynthesis.speak(u);
}

export function useVoices(lang: string) {
  const [vs, setVs] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!hasTTS()) return;
    const f = () => setVs(voicesFor(lang));
    f();
    speechSynthesis.addEventListener('voiceschanged', f);
    return () => speechSynthesis.removeEventListener('voiceschanged', f);
  }, [lang]);
  return vs;
}
