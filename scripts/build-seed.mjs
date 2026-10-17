// Gera supabase/seed.sql a partir de content/*.json
// Uso: npm run seed   → depois cole supabase/seed.sql no SQL Editor do Supabase.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = new URL('../content/', import.meta.url).pathname;
const q = (obj) => {
  const s = JSON.stringify(obj);
  if (s.includes('$j$')) throw new Error('Conteúdo contém $j$');
  return `$j$${s}$j$::jsonb`;
};

let sql = '-- Gerado por scripts/build-seed.mjs — não edite à mão\n';
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  sql += `\ninsert into public.courses (lang, sort, meta) values ('${c.lang}', ${c.sort}, ${q(c.meta)})\n  on conflict (lang) do update set sort = excluded.sort, meta = excluded.meta;\n`;
  for (const w of c.weeks) {
    sql += `insert into public.course_weeks (lang, n, data) values ('${c.lang}', ${w.n}, ${q(w)})\n  on conflict (lang, n) do update set data = excluded.data;\n`;
  }
  const ns = c.weeks.map((w) => w.n).join(',');
  sql += `delete from public.course_weeks where lang = '${c.lang}' and n not in (${ns});\n`;
}
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), sql);
console.log('supabase/seed.sql gerado.');
