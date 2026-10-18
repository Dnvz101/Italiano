import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchLyrics } from '@/lib/lyrics-provider';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo.' }, { status: 401 });

  const u = new URL(req.url);
  const title = (u.searchParams.get('title') || '').trim().slice(0, 120);
  const artist = (u.searchParams.get('artist') || '').trim().slice(0, 120);
  if (!title || !artist) return NextResponse.json({ error: 'Informe música e artista.' }, { status: 400 });

  try {
    const results = await searchLyrics(title, artist);
    return NextResponse.json({ results });
  } catch (e: any) {
    const msg = e?.name === 'TimeoutError' ? 'O serviço de letras demorou para responder. Tente de novo.' : e.message;
    return NextResponse.json({ error: msg || 'Falha ao buscar a letra.' }, { status: 502 });
  }
}
