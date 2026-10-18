-- Ascolto v14 · Aula completa (trechos comentados, sons e curiosidades)
-- Rode no Supabase: SQL Editor → cole este arquivo → Run (depois do 0001 e 0002).
-- A aula fica junto da letra, compartilhada com a família (mesmas regras de segurança da letra).
alter table public.lyrics add column if not exists lesson jsonb;
