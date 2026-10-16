// Função serverless da Vercel: traduz linhas de letra para português (BR)
// usando a API da Anthropic (Claude).
//
// Variáveis de ambiente (Vercel → Project → Settings → Environment Variables):
//   ANTHROPIC_API_KEY  (obrigatória) sua chave da API
//   ACCESS_CODE        (recomendada) código que a família digita em ⚙️ no app,
//                       para estranhos não gastarem sua API
//   ANTHROPIC_MODEL    (opcional) padrão: claude-haiku-5-5

const LANGS = { it: 'italiano', de: 'alemão' };
const MAX_LINES = 150;
const MAX_CHARS = 12000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  const code = process.env.ACCESS_CODE;
  if (code && req.headers['x-access-code'] !== code) {
    return res.status(401).json({ error: 'Código de acesso inválido. Configure em ⚙️ no app.' });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada na Vercel.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const lines = Array.isArray(body && body.lines) ? body.lines.map(l => String(l ?? '')) : null;
  const from = LANGS[body && body.from] ? body.from : 'it';

  if (!lines || !lines.length) return res.status(400).json({ error: 'Envie { lines: [...] }.' });
  if (lines.length > MAX_LINES || lines.join('\n').length > MAX_CHARS) {
    return res.status(413).json({ error: 'Letra grande demais.' });
  }

  const numbered = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
  const prompt =
`Você é um professor de ${LANGS[from]} para brasileiros. Traduza cada linha abaixo para o português do Brasil.
Regras:
- Tradução natural, como um brasileiro diria, mas fiel ao sentido. Se houver gíria ou expressão idiomática, traduza o sentido.
- Mantenha exatamente ${lines.length} itens, na mesma ordem. Linha vazia vira string vazia.
- Responda SOMENTE com um array JSON de strings, sem comentários.

${numbered}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: (data && data.error && data.error.message) || 'Erro na API.' });
    }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    let out = match ? JSON.parse(match[0]) : null;
    if (!Array.isArray(out)) return res.status(502).json({ error: 'Resposta inesperada da IA.' });
    out = lines.map((l, i) => (l.trim() ? String(out[i] ?? '') : ''));
    return res.status(200).json({ translations: out });
  } catch (e) {
    return res.status(500).json({ error: 'Falha ao traduzir: ' + e.message });
  }
};
