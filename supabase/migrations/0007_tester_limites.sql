-- v31 · Conta de teste: 2 semanas, 2 músicas próprias e pedido de liberação grátis
-- Rode uma vez no SQL Editor do Supabase (depois do 0006). Pode rodar de novo sem problema.

-- limites do tester (editáveis no painel → ☕ Planos)
update public.app_config
   set value = value || '{"tester_weeks": 2, "tester_songs": 2}'::jsonb, updated_at = now()
 where key = 'limits' and not (value ? 'tester_weeks');

-- pedidos de liberação: o tester toca em "Pedir liberação" e aparece no painel
create table if not exists public.plan_requests (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  message text not null default '',
  created_at timestamptz not null default now()
);
alter table public.plan_requests enable row level security;
grant select, insert, update, delete on public.plan_requests to authenticated;
drop policy if exists "meu pedido" on public.plan_requests;
create policy "meu pedido" on public.plan_requests for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- liberou a conta (saiu de tester): o pedido some sozinho
create or replace function public.clear_plan_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan <> 'tester' then delete from public.plan_requests where user_id = new.user_id; end if;
  return new;
end $$;
drop trigger if exists user_plans_clear_request on public.user_plans;
create trigger user_plans_clear_request after insert or update on public.user_plans
  for each row execute function public.clear_plan_request();

-- tester também tem limite de músicas próprias no banco (vale mesmo se alguém burlar a tela)
create or replace function public.enforce_song_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb;
  n int;
  pl text;
begin
  select value into cfg from public.app_config where key = 'limits';
  if public.is_admin() then return new; end if;
  select plan into pl from public.user_plans where user_id = new.user_id;
  select count(*) into n from public.user_songs where user_id = new.user_id;
  if pl = 'tester' and n >= coalesce((cfg->>'tester_songs')::int, 2) then
    raise exception 'Conta de teste: limite de músicas atingido. Peça a liberação (é grátis).' using errcode = 'P0001';
  end if;
  if cfg is null or not coalesce((cfg->>'enabled')::boolean, false) then return new; end if;
  if public.plan_active(new.user_id) then return new; end if;
  if n >= coalesce((cfg->>'own_songs')::int, 4) then
    raise exception 'Limite de músicas do plano grátis atingido.' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- o painel passa a mostrar quem pediu liberação
drop function if exists public.admin_users();
create or replace function public.admin_users()
returns table (
  id uuid, email text, name text, household text, created_at timestamptz, last_sign_in_at timestamptz,
  last_day date, days_30 int, weeks jsonb, songs int, phrases int, plan text, until date, note text,
  requested_at timestamptz, anonymous boolean
)
language plpgsql stable security definer set search_path = public, auth as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'acesso negado' using errcode = '42501'; end if;
  return query
  select
    u.id, u.email::text, coalesce(p.name, ''), coalesce(h.name, ''), u.created_at, u.last_sign_in_at,
    (select max(a.day) from public.activity_days a where a.user_id = u.id),
    (select count(*)::int from public.activity_days a where a.user_id = u.id and a.day >= current_date - 30),
    coalesce((select jsonb_object_agg(cp.lang, (select max(x) from unnest(cp.started) x))
              from public.course_progress cp where cp.user_id = u.id), '{}'::jsonb),
    (select count(*)::int from public.user_songs s where s.user_id = u.id),
    (select count(*)::int from public.user_phrases f where f.user_id = u.id),
    coalesce(up.plan, 'free'), up.until, coalesce(up.note, ''),
    pr.created_at,
    coalesce(u.is_anonymous, false)
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.households h on h.id = p.household_id
  left join public.user_plans up on up.user_id = u.id
  left join public.plan_requests pr on pr.user_id = u.id
  order by pr.created_at desc nulls last, u.created_at desc;
end $$;
revoke execute on function public.admin_users() from anon;
