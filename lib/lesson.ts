'use client';
// Chamadas de IA que preparam uma letra: tradução linha a linha e aula completa.
// Funções soltas (não ligadas a uma tela): se a pessoa trocar de aba no meio, o resultado é salvo do mesmo jeito.

async function post(url: string, body: any) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Erro ' + r.status);
  return d;
}

export const requestLesson = (lang: string, title: string, artist: string, lines: string[]) =>
  post('/api/full-lesson', { lang, title, artist, lines }).then((d) => d.lesson);

export const requestTranslation = (lang: string, lines: string[]) =>
  post('/api/translate', { from: lang, lines }).then((d) => ({
    translations: d.translations as string[],
    readings: (d.readings as string[] | undefined) || undefined,
  }));
