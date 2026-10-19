import { NextResponse } from 'next/server';
import { LANGS as ALL_LANGS, JA_WRITING } from '@/lib/langs';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaudeJSON, checkQuota, logUsage, MODEL } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS: Record<string, string> = Object.fromEntries(Object.entries(ALL_LANGS).map(([k, v]) => [k, v.pt]));
const STYLE: Record<number, string> = {
  1: 'Frases MUITO curtas (até 8 palavras), só presente, vocabulário básico. Uma pergunta simples por vez.',
  2: 'Frases curtas (até 12 palavras), presente e passado simples, vocabulário do dia a dia.',
  3: 'Frases naturais, vários tempos verbais, algumas expressões idiomáticas comuns.',
  4: 'Fale como um nativo, com naturalidade, expressões idiomáticas e ritmo normal de conversa.',
};
const clip = (s: any, n: number) => String(s ?? '').trim().slice(0, n);
const str = { type: 'string' };
const TOOL = {
  name: 'responder',
  description: 'Envia a próxima fala do parceiro de conversa.',
  schema: {
    type: 'object',
    properties: {
      reply: { ...str, description: 'Sua resposta, no idioma estudado' },
      translation: { ...str, description: 'Tradução da sua resposta para o português do Brasil' },
      recast: {
        ...str,
        description:
          'A última mensagem do aluno dita do jeito natural no idioma estudado; string vazia se já estava boa',
      },
      tip: { ...str, description: 'Dica curtíssima em português sobre o recast; string vazia se não houver' },
    },
    required: ['reply', 'translation', 'recast', 'tip'],
  },
};

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo para conversar.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lang = LANGS[body?.lang] ? body.lang : null;
  if (!lang) return NextResponse.json({ error: 'Idioma inválido.' }, { status: 400 });
  const level = Math.min(4, Math.max(1, Number(body?.level) || 1));
  const topic = {
    title: clip(body?.topic?.title, 120),
    artist: clip(body?.topic?.artist, 120),
    theme: clip(body?.topic?.theme, 160),
    vocab: (Array.isArray(body?.topic?.vocab) ? body.topic.vocab : []).slice(0, 14).map((v: any) => clip(v, 60)),
    free: clip(body?.topic?.free, 120),
  };
  const history: { role: 'ai' | 'me'; text: string }[] = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-14)
    .map((m: any) => ({ role: m?.role === 'ai' ? 'ai' : 'me', text: clip(m?.text, 600) }))
    .filter((m: any) => m.text);

  const L = LANGS[lang];
  const about = topic.free
    ? `Tema escolhido pelo aluno: ${topic.free}.`
    : topic.title
      ? `Tema: a música "${topic.title}"${topic.artist ? ` de ${topic.artist}` : ''} que o aluno está estudando${topic.theme ? ` (assunto da aula: ${topic.theme})` : ''}. Converse sobre o que a música fala e sobre a vida do aluno a partir dela, sem citar a letra.`
      : 'Tema: o dia a dia do aluno.';
  const transcript = history.length
    ? history.map((m) => `${m.role === 'ai' ? 'VOCÊ' : 'ALUNO'}: ${m.text}`).join('\n')
    : '(a conversa ainda não começou: puxe o assunto com uma saudação e uma pergunta)';

  const prompt = `Você é um parceiro de conversa nativo de ${L}, simpático e paciente, conversando com um aluno brasileiro de nível ${level} de 4.
${about}
${topic.vocab.length ? `Use naturalmente algumas destas palavras e expressões que ele está estudando: ${topic.vocab.join('; ')}.` : ''}

Estilo: ${STYLE[level]}
Regras:
- Responda SEMPRE em ${L}, com 1 a 3 frases, e termine com uma pergunta para manter a conversa.
- Nunca corrija de forma explícita nem diga "está errado". Se a última mensagem do aluno tiver erro ou soar estranha, retome a ideia certa de forma natural na sua resposta e coloque a versão natural no campo "recast".
- Se o aluno escrever em português (porque não sabe dizer), coloque em "recast" como se diz aquilo em ${L} e continue a conversa.
- "tip": no máximo 1 frase curta em português, só quando o recast ensinar algo útil.
- Tom leve e encorajador: o aluno deve sentir vontade de continuar.${lang === 'ja' ? `
- Japonês: frases curtas, em linguagem educada simples (です/ます) no nível 1 e 2. O aluno pode escrever em romaji (ex.: "watashi wa genki desu"): entenda normalmente e mostre em "recast" como se escreve em japonês.
- Em "translation", comece com o romaji da sua fala entre parênteses e depois a tradução.
${JA_WRITING}` : ''}

Conversa até agora:
${transcript}

Entregue a próxima fala chamando a ferramenta responder.`;

  try {
    await checkQuota(sb, user.id, 'chat');
    const model = process.env.AI_MODEL_CHAT || MODEL();
    const { data, usage } = await callClaudeJSON<any>(prompt, TOOL, 1500, model);
    await logUsage(sb, user.id, 'chat', model, usage);
    const reply = clip(data?.reply, 800);
    if (!reply) throw new AiError('Resposta inesperada da IA. Tente de novo.', 502);
    return NextResponse.json({
      reply,
      translation: clip(data?.translation, 800),
      recast: history.length ? clip(data?.recast, 600) : '',
      tip: history.length ? clip(data?.tip, 300) : '',
    });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha na conversa.' }, { status });
  }
}
