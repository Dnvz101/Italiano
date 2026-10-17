-- Ascolto v10 · Minha música
-- Rode no Supabase: SQL Editor → cole este arquivo → Run (depois do 0001).

create table public.user_songs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  lang text not null,
  title text not null,
  artist text not null,
  level int not null check (level between 1 and 4),
  duration_sec int,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index user_songs_user_idx on public.user_songs (user_id, lang);

alter table public.user_songs enable row level security;

-- dono gerencia; a família pode ver (para trocar indicações)
create policy "ver musicas minhas e da familia" on public.user_songs for select
  using (user_id = auth.uid() or household_id = public.my_household());
create policy "criar minhas musicas" on public.user_songs for insert
  with check (user_id = auth.uid() and (household_id is null or household_id = public.my_household()));
create policy "editar minhas musicas" on public.user_songs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "apagar minhas musicas" on public.user_songs for delete
  using (user_id = auth.uid());

-- músicas próprias que a pessoa está estudando (os cards entram na revisão)
alter table public.course_progress add column if not exists songs text[] not null default '{}';
