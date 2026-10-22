import type { SupabaseClient } from '@supabase/supabase-js';
import { access, mergeLimits, type Plan } from './plan';

/** Lê limites e plano com a sessão da própria pessoa (RLS). Se as tabelas ainda não existem, ninguém tem limite. */
export async function serverAccess(sb: SupabaseClient, userId: string) {
  try {
    const [cfg, plan, adm] = await Promise.all([
      sb.from('app_config').select('value').eq('key', 'limits').maybeSingle(),
      sb.from('user_plans').select('plan,until').eq('user_id', userId).maybeSingle(),
      sb.rpc('is_admin'),
    ]);
    const limits = mergeLimits(cfg.error ? null : cfg.data?.value);
    const p = (plan.error ? null : (plan.data as Plan)) || null;
    const isAdmin = !adm.error && adm.data === true;
    return { limits, ...access(limits, p, isAdmin), tester: !isAdmin && p?.plan === 'tester' };
  } catch {
    const limits = mergeLimits(null);
    return { limits, ...access(limits, null, false), tester: false };
  }
}

/** Conta de teste: já usou todas as aulas da IA? (conta aula completa + análise de música própria, desde sempre) */
export async function testerBlocked(sb: SupabaseClient, userId: string, max: number) {
  const { count } = await sb
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('kind', ['full-lesson', 'analyze-song']);
  return (count || 0) >= max;
}
export const testerMsg = (max: number) =>
  `Na conta de teste dá para gerar ${max} aulas com a IA, e você já usou todas. As aulas que você gerou continuam aqui, e todo o resto do app segue liberado.`;
