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

/**
 * Bloqueia quem passou do limite de chamadas nas últimas 24h.
 * A conversa ("chat") tem limite próprio, para não consumir o das aulas e traduções.
 */
export async function checkQuota(sb: SupabaseClient, userId: string, kind: 'chat' | 'other' = 'other') {
  const limit = kind === 'chat' ? Number(process.env.AI_CHAT_DAILY_LIMIT || 150) : Number(process.env.AI_DAILY_LIMIT || 30);
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let q = sb.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since);
  q = kind === 'chat' ? q.eq('kind', 'chat') : q.neq('kind', 'chat');
  const { count, error } = await q;
  if (error) throw new AiError('Erro ao verificar o limite de uso.');
  if ((count || 0) >= limit)
    throw new AiError(
      kind === 'chat'
        ? `Limite de ${limit} mensagens de conversa por dia atingido. Volte amanhã!`
        : `Limite de ${limit} usos da IA por dia atingido. Tente amanhã.`,
      429
    );
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

/**
 * Pede a resposta como chamada de ferramenta: a API devolve um objeto JSON já validado
 * contra o schema, sem o risco de aspas soltas ou texto em volta.
 */
export async function callClaudeJSON<T = any>(
  prompt: string,
  tool: { name: string; description: string; schema: Record<string, any> },
  maxTokens = 8000,
  modelOverride?: string
): Promise<{ data: T; model: string; usage: any }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError('ANTHROPIC_API_KEY não configurada na Vercel.');
  const model = modelOverride || MODEL();
  const base = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  const r = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      tools: [{ name: tool.name, description: tool.description, input_schema: tool.schema }],
      // "auto": alguns modelos não aceitam forçar a ferramenta ("tool"/"any").
      // O prompt pede para usar a ferramenta; se vier texto, o plano B abaixo lê o JSON.
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(55000),
  }).catch((e) => {
    throw new AiError(e?.name === 'TimeoutError' ? 'A IA demorou demais para responder. Tente de novo.' : 'Falha de conexão com a IA.', 504);
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new AiError(data?.error?.message || 'Erro na API da IA.', 502);
  if (data.stop_reason === 'max_tokens')
    throw new AiError('A resposta da IA ficou grande demais e foi cortada. Tente de novo.', 502);
  const block = (data.content || []).find((b: any) => b.type === 'tool_use' && b.name === tool.name);
  let out = block?.input;
  if (!out) {
    // plano B: alguns modelos podem responder em texto; tenta extrair o JSON
    const text = (data.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    const clean = text.replace(/```(?:json)?/g, '');
    const a = clean.indexOf('{');
    const b = clean.lastIndexOf('}');
    try {
      out = a >= 0 && b > a ? JSON.parse(clean.slice(a, b + 1)) : null;
    } catch {}
  }
  if (!out || typeof out !== 'object') {
    console.error('Resposta da IA sem JSON', { stop_reason: data.stop_reason, content: JSON.stringify(data.content)?.slice(0, 500) });
    throw new AiError('Resposta inesperada da IA. Tente de novo.', 502);
  }
  return { data: out as T, model, usage: data.usage || {} };
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
