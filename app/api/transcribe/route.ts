import { NextResponse } from 'next/server';
import { LANGS as ALL_LANGS } from '@/lib/langs';
import { createClient } from '@/lib/supabase/server';
import { AiError, checkQuota } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Transcrição da gravação do Shadowing pelo Gemini (a API da Anthropic não recebe áudio).
// Usada no Android, onde o navegador não consegue gravar e reconhecer a voz ao mesmo tempo.
const LANGS: Record<string, string> = Object.fromEntries(Object.entries(ALL_LANGS).map(([k, v]) => [k, v.pt]));
const MAX_B64 = 2_800_000; // ~2 MB de áudio: bem mais que uma linha de música
const MIMES = ['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg'];

const enabled = () => !!process.env.GEMINI_API_KEY;
// Modelos "lite" respondem rápido e quase não "pensam": ideais para transcrever uma frase.
const MODELS = () =>
  [process.env.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'].filter(
    (m, i, a): m is string => !!m && a.indexOf(m) === i
  );

async function call(model: string, parts: any[], timeoutMs: number) {
  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const t0 = Date.now();
  const r = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0, maxOutputTokens: 1024 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const d = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, d, ms: Date.now() - t0 };
}

/** Tenta o modelo configurado e, se ele não existir ou falhar, os "lite" em seguida. */
async function gemini(parts: any[]) {
  let last = '';
  const started = Date.now();
  for (const model of MODELS()) {
    const left = 50000 - (Date.now() - started);
    if (left < 5000) break;
    try {
      const r = await call(model, parts, Math.min(25000, left));
      if (r.ok) return { d: r.d, model };
      last = `${model}: ${r.status} ${JSON.stringify(r.d?.error?.message || r.d).slice(0, 160)}`;
      console.error('Gemini STT', last);
      if (r.status === 401 || r.status === 403 || r.status === 429) break; // chave ou cota: outro modelo não resolve
    } catch (e: any) {
      last = `${model}: ${e?.name === 'TimeoutError' ? 'demorou demais' : e?.message}`;
      console.error('Gemini STT', last);
    }
  }
  throw new AiError(`Não consegui avaliar a gravação agora (${last}). Tente de novo.`, 502);
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.get('diag') !== '1') return NextResponse.json({ enabled: enabled() });
  // diagnóstico: abre /api/transcribe?diag=1 logado e mostra quais modelos respondem e em quanto tempo
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });
  if (!enabled()) return NextResponse.json({ enabled: false });
  const out: any[] = [];
  for (const model of MODELS()) {
    try {
      const r = await call(model, [{ text: 'Responda só: ok' }], 20000);
      out.push({ model, status: r.status, ms: r.ms, error: r.ok ? undefined : r.d?.error?.message });
    } catch (e: any) {
      out.push({ model, error: e?.name === 'TimeoutError' ? 'demorou mais de 20 s' : e?.message });
    }
  }
  return NextResponse.json({ enabled: true, models: out });
}

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo.' }, { status: 401 });
  if (!enabled()) return NextResponse.json({ error: 'Transcrição não configurada.' }, { status: 501 });

  const body = await req.json().catch(() => ({}));
  const lang = LANGS[body?.lang] ? body.lang : null;
  const audio = typeof body?.audio === 'string' ? body.audio : '';
  const mime = String(body?.mime || '').split(';')[0];
  if (!lang || !audio || !MIMES.includes(mime))
    return NextResponse.json({ error: 'Áudio inválido.' }, { status: 400 });
  if (audio.length > MAX_B64) return NextResponse.json({ error: 'Gravação longa demais.' }, { status: 413 });

  try {
    await checkQuota(sb, user.id, 'stt');
    const { d, model } = await gemini([
      {
        text:
          lang === 'ja'
            ? `Transcreva exatamente o que a pessoa fala neste áudio, em japonês. É um aluno brasileiro repetindo um verso de música, uma palavra ou uma sílaba: escreva o que ele de fato pronunciou, sem corrigir e sem completar. Responda em DUAS linhas: na primeira, a transcrição na escrita japonesa normal (kanji e kana); na segunda, a mesma fala só em hiragana, começando com "KANA: ". Sem aspas e sem mais nada. Se não houver fala, responda com uma linha vazia.`
            : `Transcreva exatamente o que a pessoa fala neste áudio, em ${LANGS[lang]}. É um aluno repetindo um verso de música ou uma palavra: escreva as palavras como ele de fato pronunciou, sem corrigir e sem completar. Responda só com a transcrição, sem aspas. Se não houver fala, responda com uma linha vazia.`,
      },
      { inline_data: { mime_type: mime === 'audio/mp4' ? 'audio/m4a' : mime, data: audio } }, // iPhone grava em mp4 (AAC)
    ]);
    const raw = (d?.candidates?.[0]?.content?.parts || [])
      .filter((p: any) => !p?.thought)
      .map((p: any) => p?.text || '')
      .join('\n');
    const clean = (x: string) => x.replace(/^["“”'「」]+|["“”'「」]+$/g, '').trim().slice(0, 400);
    let text = clean(raw.replace(/\s*\n\s*/g, ' '));
    let kana = '';
    if (lang === 'ja') {
      const lines = raw.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const k = lines.find((l: string) => /^KANA\s*[:：]/i.test(l));
      kana = k ? clean(k.replace(/^KANA\s*[:：]\s*/i, '')) : '';
      text = clean(lines.filter((l: string) => l !== k).join(' ')) || kana;
    }
    const u = d?.usageMetadata || {};
    await sb.from('ai_usage').insert({
      user_id: user.id,
      kind: 'stt',
      model,
      input_tokens: u.promptTokenCount || 0,
      output_tokens: u.candidatesTokenCount || 0,
      cost_usd: null,
    });
    return NextResponse.json(lang === 'ja' ? { text, kana } : { text });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    const msg = e?.name === 'TimeoutError' ? 'A avaliação demorou demais. Tente de novo.' : e.message;
    return NextResponse.json({ error: msg || 'Falha ao avaliar a gravação.' }, { status });
  }
}
