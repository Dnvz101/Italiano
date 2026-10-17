# Ascolto em Família · v9

App para aprender idiomas com música, pelo método natural (Stephen Krashen). Italiano e alemão, com login, progresso sincronizado entre aparelhos e letras compartilhadas com a família.

**Stack:** Next.js 15 (React 19) na Vercel · Supabase (login + Postgres) · API da Anthropic para a tradução das letras.

---

## Instalação (uma vez só)

### 1. Supabase
1. Crie uma conta em supabase.com → **New project**. Região sugerida: **Northeast Asia (Tokyo)**.
2. Abra **SQL Editor** → cole o conteúdo de `supabase/migrations/0001_init.sql` → **Run**.
3. No mesmo SQL Editor, cole `supabase/seed.sql` → **Run** (carrega as músicas e os cards).
4. **Authentication → URL Configuration**
   - *Site URL:* `https://SEU-APP.vercel.app`
   - *Redirect URLs:* `https://SEU-APP.vercel.app/auth/callback` e `http://localhost:3000/auth/callback`
5. **Authentication → Emails → Templates**: nos modelos **Magic Link** e **Confirm signup**, acrescente o código no texto do e-mail, por exemplo:
   ```
   <p>Seu código de acesso: <b>{{ .Token }}</b></p>
   ```
   Assim o e-mail traz o código para digitar no app (melhor no celular) além do link.
6. **Project Settings → API**: copie a *Project URL* e a chave *anon* (ou *publishable*).

### 2. Vercel
1. Substitua o conteúdo do repositório pelo desta pasta e faça o push.
2. **Settings → General → Framework Preset: Next.js** (antes estava *Other*, porque o app era um HTML só).
3. **Settings → Environment Variables**:
   | Nome | Valor | Tipo |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase | Config |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable | Config |
   | `ANTHROPIC_API_KEY` | já existe | Secret |
   | `AI_DAILY_LIMIT` | `30` (opcional) | Config |
   | `ANTHROPIC_MODEL` | opcional, padrão `claude-haiku-5-5` | Config |

   O `ACCESS_CODE` da v8 **não é mais usado** (quem tem login usa a IA). Pode apagar.
4. **Deployments → Redeploy**.

### 3. Primeiro acesso da família
1. **Você** entra com seu e-mail e escolhe o seu perfil antigo na tela "Encontramos progresso neste aparelho".
2. Em ⚙️ → **Família**, copie o **código de convite** e mande para sua esposa e sua filha.
3. Cada uma entra com o próprio e-mail, vai em ⚙️ → **Família → Entrar em outra família** e digita o código.
4. Se o progresso antigo dela estiver em outro celular: depois de entrar na família, ⚙️ → **Importar de novo** e escolhe o perfil dela.

> Ordem importa: entrar na família **antes** de importar, para as letras antigas irem para a família certa.

---

## O que é de quem

| Dado | Quem vê |
|---|---|
| Progresso, revisão dos cards, imersão, dias seguidos | só você |
| Minhas frases | só você |
| Traduções que você digita no exercício | só você |
| Letras coladas e tradução da IA | a família toda |
| Voz escolhida | só aquele aparelho |

A segurança fica no banco (Row Level Security): mesmo que alguém mexa no app, não consegue ler dados de outra família.

## IA
- `app/api/translate` só aceita quem está logado.
- Cada chamada fica registrada na tabela `ai_usage` (quem, quando, tokens). Limite padrão: 30 por pessoa a cada 24h (`AI_DAILY_LIMIT`).
- Para registrar o custo em dólar, preencha `AI_PRICE_INPUT_PER_MTOK` e `AI_PRICE_OUTPUT_PER_MTOK` com o preço do modelo (US$ por milhão de tokens).
- Ver o uso: Supabase → Table Editor → `ai_usage`.

## Editar músicas e cards (sem deploy)
1. Edite `content/it.json` ou `content/de.json`.
2. `npm run seed` → gera `supabase/seed.sql`.
3. Cole o `seed.sql` no SQL Editor do Supabase → Run. O app já mostra o novo conteúdo.

Novo idioma: crie `content/xx.json` no mesmo formato e rode o seed.

## Rodar no computador
```bash
npm install
cp .env.example .env.local   # preencha os valores
npm run dev                  # http://localhost:3000
```

## E-mails de login
O envio de e-mail embutido do Supabase tem limite baixo por hora e serve bem para a família. Se um dia virar produto, configure um SMTP próprio (Authentication → Emails → SMTP Settings), por exemplo Resend ou Amazon SES.

## Estrutura
```
app/            telas do Next.js (página principal, login, callback, API de tradução)
components/     App (navegação) e screens/ (Início, Semanas, Semana, Letra, Cards, Frases, Método, Ajustes, Importar)
lib/            store (dados + sincronização), course (revisão espaçada), voice, ai, supabase/
content/        cursos em JSON (fonte do seed)
supabase/       schema SQL e seed
```

## Próximas versões
- **v10 — Minha música:** colar a letra de uma música que você ama, a IA classifica o nível (🟢 no seu nível, 🔵 abaixo, 🟠 acima), sugere outra do mesmo artista e monta a aula.
