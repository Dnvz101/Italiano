-- v30 · Aulas e traduções compartilhadas + "Baciami ancora" como semana 1 do italiano
-- Rode uma vez no SQL Editor do Supabase (depois do 0004 e do 0005). Pode rodar de novo sem estragar nada.

-- ============ 1) AULAS E TRADUÇÕES DAS SEMANAS, PARA TODOS ============
-- Quem publica é só o admin (você). Todo mundo lê.
create table if not exists public.shared_lessons (
  lang text not null,
  song_key text not null,           -- 'w1', 'w2'… (semanas do curso)
  lesson jsonb not null,            -- a aula completa (trechos, sons, curiosidades)
  updated_at timestamptz not null default now(),
  primary key (lang, song_key)
);
create table if not exists public.shared_translations (
  lang text not null,
  song_key text not null,
  lines jsonb not null default '[]'::jsonb, -- [{ t, ai, kana? }]: só é usada linha a linha, quando a pessoa tem a mesma linha na letra dela
  updated_at timestamptz not null default now(),
  primary key (lang, song_key)
);
alter table public.shared_lessons enable row level security;
alter table public.shared_translations enable row level security;
drop policy if exists "ler aulas" on public.shared_lessons;
drop policy if exists "admin publica aulas" on public.shared_lessons;
drop policy if exists "ler traducoes" on public.shared_translations;
drop policy if exists "admin publica traducoes" on public.shared_translations;
create policy "ler aulas" on public.shared_lessons for select to authenticated using (true);
create policy "admin publica aulas" on public.shared_lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "ler traducoes" on public.shared_translations for select to authenticated using (true);
create policy "admin publica traducoes" on public.shared_translations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============ 2) ITALIANO: A SEMANA 1 VIRA "BACIAMI ANCORA" ============
-- As semanas antigas andam uma casa (Ci vuole un fiore vira a 2, etc.). Este bloco leva junto o que cada pessoa já tinha:
-- letras salvas, semanas começadas, dias marcados e revisão dos cards. Roda uma vez só (fica marcado).
create table if not exists public.applied_migrations (name text primary key, at timestamptz not null default now());

do $$
begin
  if exists (select 1 from public.applied_migrations where name = 'it_baciami_semana1') then
    return;
  end if;

  -- letras: wN → w(N+1) (em duas etapas, para não bater na chave única)
  update public.lyrics set song_key = 'tmp' || song_key where lang = 'it' and song_key ~ '^w[0-9]+$';
  update public.lyrics set song_key = 'w' || ((substring(song_key from 5))::int + 1)
   where lang = 'it' and song_key ~ '^tmpw[0-9]+$';

  -- progresso: semanas começadas, dias marcados e revisão dos cards das semanas
  update public.course_progress set
    started = coalesce((select array_agg(x + 1 order by x) from unnest(started) x), '{1}'),
    checks = coalesce((select jsonb_object_agg(case when k ~ '^[0-9]+$' then (k::int + 1)::text else k end, v)
                         from jsonb_each(checks) e(k, v)), '{}'::jsonb),
    srs = coalesce((select jsonb_object_agg(case when k ~ '^w[0-9]+-[0-9]+$'
                                               then 'w' || (split_part(substr(k, 2), '-', 1)::int + 1) || '-' || split_part(k, '-', 2)
                                               else k end, v)
                      from jsonb_each(srs) e(k, v)), '{}'::jsonb)
  where lang = 'it';

  insert into public.applied_migrations (name) values ('it_baciami_semana1');
end $$;

-- conteúdo do curso no banco (se o seed já tinha sido rodado): cole também o supabase/seed.sql novo.
