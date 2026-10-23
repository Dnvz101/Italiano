import { NextResponse } from 'next/server';
import { serverAccess } from '@/lib/plan-server';
import { LANGS as ALL_LANGS, JA_WRITING } from '@/lib/langs';
import { createClient } from '@/lib/supabase/server';
import { AiError, callClaudeJSON, checkQuota, logUsage, MODEL } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Professor de bolso: explica uma dica da aula (o "M" do A.M.E.) como se o aluno tivesse 12 anos.
const LANGS: Record<string, string> = Object.fromEntries(Object.entries(ALL_LANGS).map(([k, v]) => [k, v.pt]));
const clip = (s: any, n: number) => String(s ?? '').trim().slice(0, n);
const TOOL = {
  name: 'explicar',
  description: 'Envia a resposta do professor.',
  schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'Explicação em português do Brasil, simples, como para uma criança de 12 anos' },
      examples: {
        type: 'array',
        description: 'De 0 a 3 exemplos novos e curtos no idioma estudado, com tradução',
        items: {
          type: 'object',
          properties: { t: { type: 'string' }, pt: { type: 'string' } },
          required: ['t', 'pt'],
        },
      },
    },
    required: ['reply', 'examples'],
  },
};

export async function POST(req: Request) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Faça login de novo.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const lang = LANGS[body?.lang] ? body.lang : null;
  if (!lang) return NextResponse.json({ error: 'Idioma inválido.' }, { status: 400 });
  const ctx = {
    line: clip(body?.context?.line, 200),
    translation: clip(body?.context?.translation, 200),
    tip: clip(body?.context?.tip, 700),
  };
  const history: { role: 'ai' | 'me'; text: string }[] = (Array.isArray(body?.messages) ? body.messages : [])
    .slice(-12)
    .map((m: any) => ({ role: m?.role === 'ai' ? 'ai' : 'me', text: clip(m?.text, 700) }))
    .filter((m: any) => m.text);
  if (!history.length || history[history.length - 1].role !== 'me')
    return NextResponse.json({ error: 'Escreva sua dúvida.' }, { status: 400 });

  const L = LANGS[lang];
  const prompt = `Você é um PROFESSOR PACIENTE de ${L} para brasileiros. O aluno está estudando uma música e leu esta dica da aula:
${ctx.line ? `Trecho: "${ctx.line}"${ctx.translation ? ` (${ctx.translation})` : ''}\n` : ''}Dica: ${ctx.tip || '(sem dica)'}

Explique como se o aluno tivesse 12 anos: quem aprende um idioma novo é criança de novo.
Regras:
- Responda em português do Brasil, com frases curtas e palavras simples. No máximo 6 frases.
- Se usar um nome de gramática (ex.: "imperativo"), explique na hora com palavras do dia a dia (ex.: "é o jeito de mandar ou pedir: faz!, olha!").
- Compare com o português sempre que ajudar. Pode usar uma imagem ou comparação divertida.
- Responda exatamente à pergunta do aluno, sem dar uma aula inteira.
- Em "examples", dê de 1 a 3 frases NOVAS e curtas em ${L} (nunca versos da música) que mostrem a regra, com tradução.
- Se o aluno pedir para praticar, proponha um desafio bem simples e corrija com carinho a resposta dele.${lang === 'ja' ? `\n${JA_WRITING}` : ''}

Conversa:
${history.map((m) => `${m.role === 'ai' ? 'PROFESSOR' : 'ALUNO'}: ${m.text}`).join('\n')}

Chame a ferramenta explicar direto, sem escrever nada antes. Seja breve: a explicação inteira cabe em um parágrafo curto.`;

  try {
    await checkQuota(sb, user.id, 'chat');
    const acc = await serverAccess(sb, user.id);
    if (acc.free) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await sb
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('kind', ['chat', 'tutor'])
        .gte('created_at', since);
      if ((count || 0) >= acc.limits.chat_per_day)
        return NextResponse.json(
          { error: `No plano grátis são ${acc.limits.chat_per_day} mensagens com a IA por dia. ${acc.limits.support_text}`, code: 'limit' },
          { status: 402 }
        );
    }
    const model = process.env.AI_MODEL_CHAT || MODEL();
    const { data, usage } = await callClaudeJSON<any>(prompt, TOOL, 4000, model);
    await logUsage(sb, user.id, 'tutor', model, usage);
    const reply = clip(data?.reply, 1500);
    if (!reply) throw new AiError('Resposta inesperada da IA. Tente de novo.', 502);
    const examples = (Array.isArray(data?.examples) ? data.examples : [])
      .slice(0, 3)
      .map((x: any) => ({ t: clip(x?.t, 200), pt: clip(x?.pt, 200) }))
      .filter((x: any) => x.t);
    return NextResponse.json({ reply, examples });
  } catch (e: any) {
    const status = e instanceof AiError ? e.status : 500;
    return NextResponse.json({ error: e.message || 'Falha ao explicar.' }, { status });
  }
}
