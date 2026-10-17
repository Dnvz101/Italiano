-- Ascolto · schema inicial (v9)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run.

-- ============ TABELAS ============

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Minha família',
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  household_id uuid references public.households(id) on delete set null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Conteúdo dos cursos (editável sem deploy)
create table public.courses (
  lang text primary key,
  sort int not null default 0,
  meta jsonb not null
);

create table public.course_weeks (
  lang text not null references public.courses(lang) on delete cascade,
  n int not null,
  data jsonb not null,
  primary key (lang, n)
);

-- Progresso de cada pessoa em cada idioma
create table public.course_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lang text not null,
  started int[] not null default '{1}',
  checks jsonb not null default '{}'::jsonb,
  srs jsonb not null default '{}'::jsonb,
  imm jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, lang)
);

create table public.activity_days (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

create table public.user_phrases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lang text not null,
  text text not null,
  meaning text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index user_phrases_user_idx on public.user_phrases (user_id, lang);

-- Letras: privadas da família (household). song_key = 'w1', 'w2'... (futuro: músicas próprias)
create table public.lyrics (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  lang text not null,
  song_key text not null,
  lines jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (household_id, lang, song_key)
);

-- Traduções que cada pessoa digita (exercício), por texto da linha
create table public.lyric_answers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lyric_id uuid not null references public.lyrics(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, lyric_id)
);

-- Registro de uso da IA (limite diário e custo)
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  model text,
  input_tokens int,
  output_tokens int,
  cost_usd numeric(10, 6),
  created_at timestamptz not null default now()
);
create index ai_usage_user_idx on public.ai_usage (user_id, created_at);

-- ============ FUNÇÕES ============

create or replace function public.my_household()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- Cria família + perfil para um usuário (usado no cadastro e como reparo)
create or replace function public.create_profile_for(uid uuid, display_name text)
returns void language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if exists (select 1 from public.profiles where id = uid) then return; end if;
  insert into public.households (created_by) values (uid) returning id into hid;
  insert into public.profiles (id, name, household_id) values (uid, coalesce(display_name, ''), hid);
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.create_profile_for(
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, ''), '@', 1))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Chamada pelo app se o perfil não existir (ex.: usuário criado antes do schema)
create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
declare em text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select email into em from auth.users where id = auth.uid();
  perform public.create_profile_for(auth.uid(), split_part(coalesce(em, ''), '@', 1));
end $$;

create or replace function public.join_household(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into hid from public.households where invite_code = upper(trim(code));
  if hid is null then raise exception 'Código de família inválido'; end if;
  update public.profiles set household_id = hid where id = auth.uid();
  return hid;
end $$;

revoke execute on function public.create_profile_for(uuid, text) from public, anon, authenticated;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.join_household(text) to authenticated;

-- ============ SEGURANÇA (RLS) ============

alter table public.households      enable row level security;
alter table public.profiles        enable row level security;
alter table public.courses         enable row level security;
alter table public.course_weeks    enable row level security;
alter table public.course_progress enable row level security;
alter table public.activity_days   enable row level security;
alter table public.user_phrases    enable row level security;
alter table public.lyrics          enable row level security;
alter table public.lyric_answers   enable row level security;
alter table public.ai_usage        enable row level security;

create policy "conteudo publico" on public.courses      for select using (true);
create policy "semanas publicas" on public.course_weeks for select using (true);

create policy "ver minha familia"    on public.households for select using (id = public.my_household());
create policy "editar minha familia" on public.households for update using (id = public.my_household()) with check (id = public.my_household());

create policy "ver perfis da familia" on public.profiles for select using (id = auth.uid() or household_id = public.my_household());
create policy "editar meu perfil"     on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- só nome e configurações podem ser alterados pelo usuário (família muda via join_household)
revoke update on public.profiles from anon, authenticated;
grant update (name, settings) on public.profiles to authenticated;
revoke update on public.households from anon, authenticated;
grant update (name) on public.households to authenticated;

create policy "meu progresso" on public.course_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meus dias"     on public.activity_days   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "minhas frases" on public.user_phrases    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "minhas respostas" on public.lyric_answers for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "letras da familia" on public.lyrics for all
  using (household_id = public.my_household())
  with check (household_id = public.my_household());

create policy "ver meu uso"       on public.ai_usage for select using (user_id = auth.uid());
create policy "registrar meu uso" on public.ai_usage for insert with check (user_id = auth.uid());
