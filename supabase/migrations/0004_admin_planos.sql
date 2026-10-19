-- v26 · Painel administrativo, planos e limites
-- Rode este arquivo uma vez no SQL Editor do Supabase (depois dos anteriores).
-- Ninguém além do e-mail em public.admins consegue ler os dados de todos: tudo passa por funções que conferem is_admin().

-- ============ QUEM É ADMIN ============
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security; -- sem policies: só as funções leem
insert into public.admins (email) values ('dnvz.jp@gmail.com') on conflict do nothing;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select exists (
    select 1 from public.admins a join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
  )
$$;

-- ============ PLANOS E CONFIGURAÇÃO ============
create table if not exists public.user_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'apoiador', 'vip')),
  until date,              -- vazio = sem data para acabar
  note text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.user_plans enable row level security;
drop policy if exists "ver meu plano" on public.user_plans;
create policy "ver meu plano" on public.user_plans for select using (user_id = auth.uid());

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
drop policy if exists "config publica" on public.app_config;
create policy "config publica" on public.app_config for select to authenticated using (true);

insert into public.app_config (key, value) values
  ('limits', '{"enabled": false, "free_weeks": 2, "chat_per_day": 10, "own_songs": 4, "price_jpy": 300, "support_url": "", "support_text": "Pague um café ☕ e libere todas as semanas, a conversa sem limite e mais músicas."}'),
  ('prices', '{"usd_jpy": 150, "models": {"haiku": [1, 5], "sonnet": [3, 15], "opus": [5, 25], "gemini-2.5-flash-lite": [0.3, 0.4], "gemini": [1, 2.5]}}')
on conflict (key) do nothing;

-- plano vale? (pago e dentro da data)
create or replace function public.plan_active(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_plans
    where user_id = p_user and plan <> 'free' and (until is null or until >= current_date)
  )
$$;

-- ============ LIMITE DE MÚSICAS PRÓPRIAS (vale mesmo se alguém burlar a tela) ============
create or replace function public.enforce_song_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb;
  n int;
begin
  select value into cfg from public.app_config where key = 'limits';
  if cfg is null or not coalesce((cfg->>'enabled')::boolean, false) then return new; end if;
  if public.is_admin() or public.plan_active(new.user_id) then return new; end if;
  select count(*) into n from public.user_songs where user_id = new.user_id;
  if n >= coalesce((cfg->>'own_songs')::int, 4) then
    raise exception 'Limite de músicas do plano grátis atingido.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists user_songs_limit on public.user_songs;
create trigger user_songs_limit before insert on public.user_songs
  for each row execute function public.enforce_song_limit();

-- ============ FUNÇÕES DO PAINEL (só admin) ============
create or replace function public.admin_users()
returns table (
  id uuid, email text, name text, household text, created_at timestamptz, last_sign_in_at timestamptz,
  last_day date, days_30 int, weeks jsonb, songs int, phrases int, plan text, until date, note text
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
    coalesce(up.plan, 'free'), up.until, coalesce(up.note, '')
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.households h on h.id = p.household_id
  left join public.user_plans up on up.user_id = u.id
  order by u.created_at desc;
end $$;

create or replace function public.admin_usage(p_days int default 30)
returns table (user_id uuid, day date, kind text, model text, calls int, input_tokens bigint, output_tokens bigint, cost_usd numeric)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not public.is_admin() then raise exception 'acesso negado' using errcode = '42501'; end if;
  return query
  select a.user_id, (a.created_at at time zone 'Asia/Tokyo')::date, a.kind, coalesce(a.model, ''),
         count(*)::int, coalesce(sum(a.input_tokens), 0)::bigint, coalesce(sum(a.output_tokens), 0)::bigint, sum(a.cost_usd)
  from public.ai_usage a
  where a.created_at >= now() - make_interval(days => greatest(1, least(p_days, 400)))
  group by 1, 2, 3, 4;
end $$;

create or replace function public.admin_set_plan(p_user uuid, p_plan text, p_until date, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'acesso negado' using errcode = '42501'; end if;
  insert into public.user_plans (user_id, plan, until, note, updated_at)
  values (p_user, p_plan, p_until, coalesce(p_note, ''), now())
  on conflict (user_id) do update set plan = excluded.plan, until = excluded.until, note = excluded.note, updated_at = now();
end $$;

create or replace function public.admin_set_config(p_key text, p_value jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'acesso negado' using errcode = '42501'; end if;
  if p_key not in ('limits', 'prices') then raise exception 'chave inválida'; end if;
  insert into public.app_config (key, value, updated_at) values (p_key, p_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;

revoke execute on function public.admin_users() from anon;
revoke execute on function public.admin_usage(int) from anon;
revoke execute on function public.admin_set_plan(uuid, text, date, text) from anon;
revoke execute on function public.admin_set_config(text, jsonb) from anon;
