# Ascolto em Família · v30.1

App para aprender idiomas com música, pelo método natural (Stephen Krashen). Italiano e alemão, com login, progresso sincronizado entre aparelhos, letras compartilhadas com a família e **Minha música**: estude com as músicas que você ama, com o nível medido pela IA.

**Stack:** Next.js 15 (React 19) na Vercel · Supabase (login + Postgres) · API da Anthropic para a tradução das letras.

---

## Instalação (uma vez só)

### 1. Supabase
1. Crie uma conta em supabase.com → **New project**. Região sugerida: **Northeast Asia (Tokyo)**.
2. Abra **SQL Editor** → cole o conteúdo de `supabase/migrations/0001_init.sql` → **Run**. Depois, uma de cada vez, `supabase/migrations/0002_minha_musica.sql` e `0003_aula_completa.sql` → **Run**.
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

## Atualizando da v9 para a v10
1. Supabase → **SQL Editor** → cole `supabase/migrations/0002_minha_musica.sql` → **Run** (só esse; o 0001 já foi).
2. Suba os arquivos no GitHub. A Vercel faz o deploy sozinha.

## Conta de teste com limites (v31)
1. Rode `supabase/migrations/0007_tester_limites.sql` (depois do 0006). Pode rodar de novo sem problema.
2. Contas novas continuam entrando como Teste: 2 semanas de música por idioma, 2 músicas próprias e 3 aulas da IA (mude os números em Painel → ☕ Planos).
3. Quem pedir liberação aparece no Painel → 👥 Usuários → "Pediram liberação". Toque na pessoa e em "⬆ Liberar (conta normal)".

## Aulas compartilhadas (v30)
1. Rode `supabase/migrations/0006_aulas_compartilhadas.sql` (depois do 0004 e 0005) e cole o `supabase/seed.sql` novo.
2. Entre com a conta de admin, abra a semana, busque ou cole a letra e toque em "✨ Salvar e preparar a aula" (gera a tradução e a aula na sua conta).
3. Na aba Letra, toque em "📤 Publicar para todos (letra, tradução e aula)". Só a conta admin vê esse botão.
4. Quem abrir a semana depois recebe tudo pronto: a letra traduzida e a aula completa, sem gastar IA.

## Testar sem cadastro (v29)
1. Rode `supabase/migrations/0005_conta_teste.sql` no SQL Editor (depois do 0004).
2. No Supabase: **Authentication → Sign In / Providers → Allow anonymous sign-ins** = ligado.
3. Pronto: a tela de entrada passa a ter "Começar agora, sem cadastro". Toda conta nova entra no plano **Teste** (3 aulas geradas pela IA no total; o resto livre). Para liberar alguém: painel → Usuários → plano Grátis, Apoiador ou VIP.
- Cuidado: contas anônimas podem ser criadas por robôs. O Supabase já limita por IP; se aparecer abuso, ligue o CAPTCHA em Authentication → Attack Protection.

## Painel administrativo e planos (v26)
**Instalar (uma vez):** rode `supabase/migrations/0004_admin_planos.sql` no SQL Editor do Supabase. Ele cria as tabelas de planos e configuração, as funções do painel e cadastra **dnvz.jp@gmail.com** como admin. Para trocar ou acrescentar: `insert into public.admins (email) values ('outro@email.com');`.
- **Acesso:** entre no app com esse e-mail → ⚙️ Configurações → 🛠️ Painel administrativo. Quem não é admin não vê o botão, e o banco recusa as consultas mesmo que alguém tente chamar direto (tudo passa por funções que conferem o e-mail). Nenhuma chave secreta do Supabase é usada.
- **📊 Geral:** usuários, ativos em 7 e 30 dias, apoiadores, gasto com IA no mês (US$ e ¥), receita estimada e sobra.
- **👥 Usuários:** cada conta com família, último estudo, semana de cada idioma, músicas, uso de IA, e o plano (Grátis, Apoiador, Família/VIP, com data de validade e anotação).
- **🤖 Gastos IA:** por dia, por tipo, por modelo e quem mais usa. O custo é estimado pelos tokens × preço de cada modelo; os preços e a cotação são editáveis ali mesmo.
- **☕ Planos:** liga/desliga os limites do plano grátis (semanas por idioma, mensagens de conversa por dia, músicas próprias), valor do apoio, link do "pague um café" e o texto do convite. Vem **desligado**: nada muda para ninguém até você ligar.
- **Limites:** semanas acima do limite aparecem com 🔒 e a página mostra o convite por cima de uma prévia apagada; a conversa e a análise de músicas são barradas no servidor antes de chamar a IA (não gasta token); o banco também recusa músicas além do limite.
- Ainda **não tem cobrança automática**: depois que a pessoa paga, você muda o plano dela no painel.

## Japonês (v25)
Terceiro idioma, com visual próprio (vermelho, preto e branco) que entra sozinho quando o idioma é 日本語.
- **Módulo de kana (v27):** as semanas 1 e 2 são あ Hiragana e ア Katakana, antes das músicas. Roteiro de 7 dias por linhas do alfabeto, aba Letras (ouvir e repetir), Aula e Praticar (progresso letra por letra e o treino nos Cards). Terminar o treino do dia marca sozinho o próximo dia do roteiro. Enquanto o kana não estiver firme, o Início mostra o "Treino de kana de hoje" e a aba Cards ganha um pontinho vermelho. Começar uma música antes de terminar o kana pede confirmação. As semanas de kana nunca contam no limite do plano grátis.
- **Trilha de músicas:** 10 semanas (3 a 12), de さんぽ (Totoro) a 夜に駆ける (YOASOBI), com aula, roteiro e cards. Funciona mesmo sem rodar o seed (o conteúdo vem embutido em `content/ja.json`); rodar `supabase/seed.sql` de novo só serve para editar pelo banco.
- **Furigana:** no conteúdo e nas respostas da IA, a leitura vai entre colchetes depois do kanji (`今日[きょう]`). O app desenha a leitura em cima do kanji, a voz lê só o texto e o romaji aparece embaixo (`lib/kana.ts`, `components/Jt.tsx`).
- **Letras:** a tradução da IA traz também a leitura em hiragana de cada linha; a letra mostra o romaji embaixo.
- **Pronúncia:** a nota é por sílaba e compara pela leitura em hiragana (o Gemini devolve a fala escrita e em kana). Precisa da chave do Gemini, como no Android.
- **Kana e sons:** hiragana e katakana completos (46 + 46), com exemplo, e 10 sons difíceis para brasileiros.
- **Cards (v26):** submenu com 🗂️ Músicas, あ Hiragana, ア Katakana e 漢 Kanji (96 kanji básicos em 7 grupos, com leituras on/kun e exemplo). Cada baralho tem a sua revisão espaçada: 10 kana novos por dia, 5 kanji.
- **Escrever com o dedo (v28):** em Frases → Kana e sons (botão "✍️ Escrever esta letra" e a aba "✍️ Escrever", que sorteia letras para escrever de memória), na aba Letras das semanas de kana e no verso dos cards de kana e kanji. Mostra a ordem dos traços animada, confere quantidade, ordem e direção de cada traço e dá nota. Os traços vêm do [KanjiVG](https://kanjivg.tagaini.net) (CC BY-SA 3.0, Ulrich Apel), em `public/strokes.json`, gerado por `scripts/fetch-strokes.py`.
- **Câmera:** os 80 objetos com nome japonês e leitura.
- **Desenhos:** `public/media/ja-*.webp`, gerados por `scripts/ja-art.py` (SVG próprio, sem IA de imagem).

## Minha música (v10)
- Aba **🎤 Músicas** → cole a letra de uma música que você ama (e, se quiser, a duração, para medir palavras por minuto).
- A IA dá o nível da música (1 Iniciante a 4 Avançado), calibrada pelas músicas da trilha, e monta tema, aula, caça-palavras e 8 a 10 cards.
- O app compara com o **seu** nível (automático pela trilha, ou escolhido em ⚙️ → Meu nível):
  - 🟢 no seu nível ou um pouco acima (i+1): estudo completo;
  - 🔵 abaixo: ótima para cantar junto, e sugere outras do mesmo artista;
  - 🟠 acima: abre no modo **só o refrão** (linhas que se repetem) e sugere outras do mesmo artista.
- Nunca bloqueia: a pessoa sempre pode estudar a música que escolheu.
- "Começar a estudar" coloca os cards da música na revisão, com prioridade sobre os da trilha.
- As músicas aparecem para a família (seção "Da família"); progresso e cards continuam de cada um.

## Letras automáticas (v12)
- Botão **🔎 Buscar letra automaticamente** na letra de cada semana e no formulário de Minha música. A pessoa escolhe a versão certa, confere e salva.
- Fonte atual: **LRCLIB** (gratuito, comunitário). As letras de lá são enviadas por usuários, **sem licença das editoras**: serve para uso pessoal/família. Se o Ascolto virar produto, troque por um fornecedor licenciado (ex.: Musixmatch com plano comercial) em `lib/lyrics-provider.ts` e na variável `LYRICS_PROVIDER`.
- A busca passa pelo servidor (`/api/lyrics/search`, só com login). Em Minha música, a duração vem junto e mede as palavras por minuto.
- Não precisa de chave nem de variável nova na Vercel.

## Aula completa (v14)
- Em cada semana e em cada favorita com letra: **✨ Gerar aula completa**.
  - **Trechos comentados** pela técnica A.M.E.: Associação com o português, Memorização do que importa, Expansão com frases novas (com 🔊 e 🐢 áudio lento).
  - **Sons desta música**: 3–4 sons difíceis para brasileiros, com palavras da própria letra.
  - **Curiosidades**: só fatos que a IA afirma ter certeza, com aviso para conferir.
- O servidor só aceita versos que existem de verdade na letra colada (versos inventados pela IA são descartados).
- Uma chamada de IA por música; a aula fica salva junto da letra, para a família toda.
- Botão **🎓 Aulas em vídeo**: busca no YouTube aulas sobre aquela música.
- **Atualizando**: rode `supabase/migrations/0003_aula_completa.sql` no SQL Editor (uma linha).

## Conversa (v15)
- Aba **💬 Conversa**: bate-papo com a IA no idioma, no nível da pessoa, sobre a música da semana, uma favorita ou um tema livre (apresentar-se, comida, viagem, família, trabalho, fim de semana).
- Falar ou escrever: o 🎙️ usa o reconhecimento de voz do navegador (Chrome, Safari, Edge); as respostas podem ser lidas em voz alta.
- Erros não são corrigidos com bronca: a IA responde normalmente e mostra "Mais natural: …" com uma dica curta. Dá para escrever em português quando não souber dizer algo.
- Cada resposta tem 🔊, 🐢 e "Traduzir".
- A conversa fica salva no aparelho (por pessoa e idioma); não vai para o banco.
- Limite próprio: `AI_CHAT_DAILY_LIMIT` (padrão 150 mensagens/24h), separado do limite das aulas e traduções. Modelo: `AI_MODEL_CHAT` (padrão = `ANTHROPIC_MODEL`, Haiku).

## Perfil musical (v17)
- No Início aparece o convite "Que tipo de música você curte?" (ou ⚙️ → Perfil musical). Cada idioma tem o seu perfil.
- A pessoa marca estilos e épocas e escreve artistas que ama, em qualquer idioma. A IA sugere artistas em italiano/alemão com a mesma vibe e músicas no nível dela.
- Toda música sugerida é conferida no LRCLIB: se a letra não existe lá, a sugestão é descartada (evita música inventada). Se o LRCLIB estiver fora do ar, as sugestões aparecem sem essa conferência.
- **⭐ Estudar** leva para "Adicionar favorita" com a música preenchida e a letra já buscada.
- Custo: uma chamada do modelo de análise (`AI_MODEL_ANALYZE`, padrão Sonnet) por vez que a pessoa gera sugestões, uns ¥4–5.

## Explorar com a câmera (v22)
- Início → **📷 Explorar com a câmera**. Aponte para objetos: o nome aparece em cima, com o artigo na cor do gênero. Tocar no nome = ouvir, repetir com nota e virar card.
- O reconhecimento roda no celular (TensorFlow.js, modelo COCO-SSD, 80 objetos). A imagem não é enviada a lugar nenhum e não gasta IA.
- O modelo vem de `storage.googleapis.com` na primeira vez. Para hospedar você mesmo, coloque os arquivos do modelo em `public/` e defina `NEXT_PUBLIC_COCO_MODEL_URL`.
- Nomes dos objetos: `lib/objects.ts`.

## Alfabeto e sons (v20)
- Aba **Frases → 🔤 Alfabeto e sons**: cada letra com o nome no idioma, dica em português e nota de pronúncia; e os sons difíceis para brasileiros com palavras para repetir.
- O conteúdo fica em `lib/alphabet.ts` (fácil de corrigir ou ampliar).

## Shadowing (v16)
- Na letra bilíngue, modo **🎙️ Shadowing** (ou o 🎙️ de qualquer linha): o app fala a linha, grava você repetindo e dá uma nota pelas palavras que o reconhecimento de voz entendeu.
- Dá para ouvir a própria gravação e "Modelo + eu" para comparar ritmo e entonação.
- O navegador pede permissão do microfone na primeira vez. No iPhone use o Safari; no Android, o Chrome. Sem IA, sem custo, sem mudança no banco; as notas ficam no aparelho.
- A nota mede se as palavras saíram claras, não o sotaque: use o "Modelo + eu" para a melodia.
- **Android e iPhone (v19.1/v20.2):** no celular, gravar e reconhecer ao mesmo tempo falha. Para ter nota **e** gravação no celular, crie uma chave grátis do Gemini em aistudio.google.com/apikey e coloque na Vercel como `GEMINI_API_KEY` (tipo Secret). Sem a chave, o Android dá a nota mas não guarda a gravação.

## Ícones (v19)
- Ficam em `public/icons/`: `nome.svg` (tema claro) e `nome-dark.svg` (tema escuro). O componente `components/Icon.tsx` lista os nomes.
- Para trocar um ícone: gere um PNG chapado com fundo branco (Gemini, Recraft…), coloque numa pasta e rode `pip install vtracer pillow && python3 scripts/vectorize-icons.py pasta-png pasta-svg`. Copie o SVG para `public/icons/` e crie a versão escura trocando `#0b3d38` por `#4a958b`.

## IA
- `app/api/translate` e `app/api/analyze-song` só aceitam quem está logado.
- Cada chamada fica registrada na tabela `ai_usage` (quem, quando, tipo, tokens). Limite padrão: 30 por pessoa a cada 24h (`AI_DAILY_LIMIT`), somando traduções e análises.
- Tradução usa `ANTHROPIC_MODEL` (padrão Haiku, barato). A análise de música usa `AI_MODEL_ANALYZE` (padrão `claude-sonnet-5-5`), que acerta melhor o nível e conhece mais músicas para sugerir. É uma chamada por música, então o custo continua baixo. Para economizar, defina `AI_MODEL_ANALYZE=claude-haiku-5-5`.
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
components/     App (navegação), CardList e screens/ (Início, Trilha, Semana, Músicas, Música, Letra, Cards, Frases, Método, Ajustes, Importar)
lib/            store (dados + sincronização), course (revisão espaçada), level (nível e encaixe), voice, ai, supabase/
content/        cursos em JSON (fonte do seed)
supabase/       schema SQL e seed
```

## Próximas versões
- Módulo 2 do alemão; compartilhar trechos de letra com a família.
