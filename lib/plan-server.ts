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
    return { limits, ...access(limits, (plan.error ? null : (plan.data as Plan)) || null, !adm.error && adm.data === true) };
  } catch {
    const limits = mergeLimits(null);
    return { limits, ...access(limits, null, false) };
  }
}
