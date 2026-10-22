// Planos e limites (grátis × apoiador). Os valores ficam na tabela app_config e são editados no painel.
// Enquanto "enabled" for false, ninguém tem limite.

export type Limits = {
  enabled: boolean;
  free_weeks: number; // semanas liberadas por idioma no plano grátis
  chat_per_day: number; // mensagens de conversa por dia
  own_songs: number; // músicas próprias (favoritas)
  tester_lessons: number; // conta de teste: aulas geradas pela IA no total (aula completa + música própria)
  price_jpy: number; // valor sugerido do apoio, só para mostrar e calcular a receita no painel
  support_url: string; // link do "pague um café" (Ko-fi, Buy Me a Coffee, PayPay...)
  support_text: string;
};
export const DEFAULT_LIMITS: Limits = {
  enabled: false,
  free_weeks: 2,
  chat_per_day: 10,
  own_songs: 4,
  tester_lessons: 3,
  price_jpy: 300,
  support_url: '',
  support_text: 'Pague um café ☕ e libere todas as semanas, a conversa sem limite e mais músicas.',
};

export type Prices = { usd_jpy: number; models: Record<string, [number, number]> }; // US$ por milhão de tokens [entrada, saída]
export const DEFAULT_PRICES: Prices = {
  usd_jpy: 150,
  models: { haiku: [1, 5], sonnet: [3, 15], opus: [5, 25], 'gemini-2.5-flash-lite': [0.3, 0.4], gemini: [1, 2.5] },
};

export type Plan = { plan: 'free' | 'tester' | 'apoiador' | 'vip'; until: string | null; note?: string };
export const PLAN_NAMES: Record<string, string> = { free: 'Grátis', tester: 'Teste 🧪', apoiador: 'Apoiador ☕', vip: 'Família / VIP' };

export const planActive = (p: Plan | null | undefined) =>
  !!p && (p.plan === 'apoiador' || p.plan === 'vip') && (!p.until || p.until >= new Date().toLocaleDateString('sv'));

/** O que a pessoa pode usar agora. */
export function access(limits: Limits, plan: Plan | null, isAdmin: boolean) {
  const free = limits.enabled && !isAdmin && !planActive(plan);
  return {
    free,
    // semanas de kana (japonês) são sempre grátis e não contam no limite
    weekLocked: (n: number, weeks?: { n: number; kind?: string }[]) => {
      if (!free) return false;
      if (!weeks) return n > limits.free_weeks;
      const w = weeks.find((x) => x.n === n);
      if (w?.kind === 'kana') return false;
      return weeks.filter((x) => x.kind !== 'kana' && x.n <= n).length > limits.free_weeks;
    },
    songsFull: (mine: number) => free && mine >= limits.own_songs,
  };
}

export const mergeLimits = (v: any): Limits => ({ ...DEFAULT_LIMITS, ...(v && typeof v === 'object' ? v : {}) });
export const mergePrices = (v: any): Prices => ({
  ...DEFAULT_PRICES,
  ...(v && typeof v === 'object' ? v : {}),
  models: { ...DEFAULT_PRICES.models, ...(v?.models || {}) },
});

/** Custo estimado de uma linha de uso: usa o custo gravado; senão, tokens × preço do modelo (o nome mais específico ganha). */
export function costUsd(row: { model: string; input_tokens: number; output_tokens: number; cost_usd: number | null }, prices: Prices) {
  if (row.cost_usd != null && Number(row.cost_usd) > 0) return Number(row.cost_usd);
  const m = (row.model || '').toLowerCase();
  const key = Object.keys(prices.models)
    .filter((k) => m.includes(k.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  if (!key) return 0;
  const [pin, pout] = prices.models[key];
  return (Number(row.input_tokens) * pin + Number(row.output_tokens) * pout) / 1e6;
}
