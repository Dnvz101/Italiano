// Chamada à API da Anthropic + controle de uso (só roda no servidor)
import type { SupabaseClient } from '@supabase/supabase-js';

export const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export class AiError extends Error {
  status: number;
  constructor(msg: string, status = 500) {
    super(msg);
    this.status = status;
  }
}

/** Bloqueia quem passou do limite de chamadas nas últimas 24h */
export async function checkQuota(sb: SupabaseClient, userId: string) {
  const limit = Number(process.env.AI_DAILY_LIMIT || 30);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count, error } = await sb
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if (error) throw new AiError('Erro ao verificar o limite de uso.');
  if ((count || 0) >= limit) throw new AiError(`Limite de ${limit} usos da IA por dia atingido. Tente amanhã.`, 429);
}

export async function callClaude(prompt: string, maxTokens = 4096, modelOverride?: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError('ANTHROPIC_API_KEY não configurada na Vercel.');
  const model = modelOverride || MODEL();
  const base = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const r = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new AiError(data?.error?.message || 'Erro na API da IA.', 502);
  const text = (data.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  return { text, model, usage: data.usage || {} };
}

export async function logUsage(
  sb: SupabaseClient,
  userId: string,
  kind: string,
  model: string,
  usage: { input_tokens?: number; output_tokens?: number }
) {
  const pin = Number(process.env.AI_PRICE_INPUT_PER_MTOK || 0);
  const pout = Number(process.env.AI_PRICE_OUTPUT_PER_MTOK || 0);
  const it = usage.input_tokens || 0;
  const ot = usage.output_tokens || 0;
  const cost = pin || pout ? (it * pin + ot * pout) / 1e6 : null;
  await sb.from('ai_usage').insert({ user_id: userId, kind, model, input_tokens: it, output_tokens: ot, cost_usd: cost });
}
