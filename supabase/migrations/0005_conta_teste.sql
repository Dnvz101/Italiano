-- v29 · Contas de teste (entrada sem cadastro) e plano "tester"
-- Rode uma vez no SQL Editor do Supabase (depois do 0004).
-- E ligue em Authentication → Sign In / Providers → "Allow anonymous sign-ins".

-- 1) novo plano "tester"
alter table public.user_plans drop constraint if exists user_plans_plan_check;
alter table public.user_plans add constraint user_plans_plan_check
  check (plan in ('free', 'tester', 'apoiador', 'vip'));

-- só apoiador e VIP contam como plano pago
create or replace function public.plan_active(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_plans
    where user_id = p_user and plan in ('apoiador', 'vip') and (until is null or until >= current_date)
  )
$$;

-- 2) toda conta NOVA começa como tester (as contas que já existem não mudam)
create or replace function public.set_tester_plan()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_plans (user_id, plan, note)
  values (new.id, 'tester', 'conta nova (teste)')
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists profiles_tester on public.profiles;
create trigger profiles_tester after insert on public.profiles
  for each row execute function public.set_tester_plan();

-- 3) limite do tester: aulas geradas pela IA (aula completa + análise de música própria), no total
update public.app_config
   set value = value || '{"tester_lessons": 3}'::jsonb, updated_at = now()
 where key = 'limits' and not (value ? 'tester_lessons');
