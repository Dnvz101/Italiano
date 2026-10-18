import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AiError, checkQuota } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Transcrição da gravação do Shadowing pelo Gemini (a API da Anthropic não recebe áudio).
// Usada no Android, onde o navegador não consegue gravar e reconhecer a voz ao mesmo tempo.
const LANGS: Record<string, string> = { it: 'italiano', de: 'alemão' };
const MAX_B64 = 2_800_000; // ~2 MB de áudio: bem mais que uma linha de música
const MIMES = ['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg'];

const enabled = () => !!process.env.GEMINI_API_KEY;

export async function GET() {
  return NextResponse.json({ enabled: enabled() });
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
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
    const r = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Transcreva exatamente o que a pessoa fala neste áudio, em ${LANGS[lang]}. É um aluno repetindo um verso de música: escreva as palavras como ele de fato pronunciou, sem corrigir e sem completar. Responda só com a transcrição, sem aspas. Se não houver fala, responda com uma linha vazia.`,
              },
              { inline_data: { mime_type: mime, data: audio } },
            ],
          },
        ],
        generationConfig: { temperature: 0, maxOutputTokens: 200 },
      }),
      signal: AbortSignal.timeout(25000),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Gemini STT', r.status, JSON.stringify(d).slice(0, 400));
      throw new AiError('Não consegui avaliar a gravação agora. Tente de novo.', 502);
    }
    const text = (d?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text || '')
      .join(' ')
      .replace(/^["“”']+|["“”']+$/g, '')
      .trim()
      .slice(0, 400);
    const u = d?.usageMetadata || {};
    await sb.from('ai_usage').insert({
      user_id: user.id,
      kind: 'stt',
      model,
      input_tokens: u.promptTokenCount || 0,
      output_tokens: u.candidatesTokenCount || 0,
      cost_usd: null,
    });
    return NextResponse.json({ text });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    const msg = e?.name === 'TimeoutError' ? 'A avaliação demorou demais. Tente de novo.' : e.message;
    return NextResponse.json({ error: msg || 'Falha ao avaliar a gravação.' }, { status });
  }
}
