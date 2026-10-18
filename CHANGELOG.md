# Histórico de versões — Ascolto em Família

## v19.1 — 2026-10-18 · Shadowing no Android
- Correção: no Android a gravação funcionava, mas a nota não saía. O Chrome do Android não deixa gravar e reconhecer a voz ao mesmo tempo (o gravador fica com o microfone).
- No Android, com a variável `GEMINI_API_KEY` configurada: o app grava, converte para WAV leve e o servidor manda para o Gemini transcrever. Nota e "Minha voz" funcionam juntos. Botão mostra "Avaliando sua pronúncia…".
- No Android sem a chave: o app só reconhece (nota funciona) e avisa que a gravação não fica guardada.
- Em qualquer aparelho: se o navegador gravou mas não entendeu nada, a gravação vai para o servidor (quando a chave existe).
- Limite próprio: `AI_STT_DAILY_LIMIT` (300 avaliações por pessoa a cada 24h), separado das aulas e da conversa.
- Sem mudança de banco.

## v19 — 2026-10-18 · Ícones ilustrados
- Os emojis da navegação deram lugar a 15 ícones próprios no estilo "gordinho e colorido" (gerados no Gemini/Recraft, convertidos para SVG com a paleta do app; caça-palavras, imersão e favoritas desenhados à mão no mesmo estilo).
- Onde aparecem: barra de baixo e menu lateral (Início, Trilha, Conversa, Cards, Frases, Método), Ajustes, abas da música (Roteiro, Letra, Aula, Cards), Shadowing, títulos de Letra, Aula completa, Roteiro, Caça-palavras, Imersão, Perfil musical e Conversa.
- Abas inativas ficam em cinza e a ativa ganha cor (como nos apps de idioma); a aba ativa da música agora tem contorno, para o ícone não sumir no fundo.
- Tema escuro com versão própria de cada ícone (os contornos escuros clareiam).
- `scripts/vectorize-icons.py`: converte PNGs chapados em SVG com a paleta fixa, para trocar ícones no futuro.
- Sem mudança de banco.

## v18 — 2026-10-18 · Página da música em abas
- A página de cada semana e de cada favorita deixou de ser um rolo comprido: um cabeçalho compacto (nível, música, artista, YouTube/Spotify/Aulas) e quatro abas fixas no topo:
  - **📅 Roteiro**: sobre a música, o roteiro de 7 dias (com o progresso na aba, ex. 3/7), caça-palavras; nas favoritas também o encaixe no nível e as sugestões do mesmo artista.
  - **📄 Letra**: letra bilíngue com Exercício, Leitura e Shadowing.
  - **🎓 Aula**: a lição do tema e a aula completa da IA.
  - **🗂️ Cards**: as expressões (com o número de cards na aba).
- As abas grudam embaixo da barra do topo enquanto se rola; trocar de aba volta para o começo da seção.
- O app lembra a última aba: quem está na Letra continua na Letra ao ir para a próxima semana.
- No celular, as abas ficam com ícone em cima e nome embaixo, para caberem as quatro.
- Sem mudança de banco.

## v17.1 — 2026-10-18 · Progresso nas esperas da IA
- Anel de progresso com porcentagem e etapas ("Lendo a letra…", "Medindo velocidade e vocabulário…", "Conferindo se cada música existe…") em todas as esperas da IA: análise de música, aula completa (gerar e refazer), perfil musical e tradução da letra.
- Tempo restante estimado; se passar muito do normal, avisa que ainda está trabalhando. O anel aparece na tela sozinho no celular.
- A IA não informa o progresso real: o anel avança por estimativa e só some quando a resposta chega.
- Sem mudança de banco.

## v17 — 2026-10-18 · Perfil musical
- Novo **🎧 Perfil musical**, por idioma: a pessoa escolhe estilos, épocas e artistas que ama em qualquer idioma (até brasileiros), e a IA sugere ~6 artistas em italiano/alemão com a mesma vibe, com 2 músicas cada no nível dela.
- Cada música sugerida é **conferida na base de letras**: títulos inventados pela IA são descartados.
- **⭐ Estudar** abre "Adicionar favorita" já preenchido e busca a letra sozinho; depois é só analisar.
- No Início: convite para montar o perfil (com "Agora não") e, depois, o card **Para você** com 3 sugestões que melhor encaixam no nível.
- Na Conversa: novo tema **🎧 Minhas músicas**, sobre o gosto musical da pessoa.
- Em ⚙️ Ajustes: atalho para ver e editar o perfil.
- Textos passam a dizer "em alemão"/"em italiano" (antes: "em deutsch").
- Uma chamada de IA (Sonnet) por perfil gerado, conta no limite diário de 30. Sem mudança de banco (o perfil fica em `profiles.settings`).

## v16 — 2026-10-18 · Shadowing
- Novo modo **🎙️ Shadowing** na letra bilíngue (semanas e favoritas), ao lado de Exercício e Leitura, e um 🎙️ em cada linha que abre direto nela.
- **▶️ Ouvir e repetir**: o app fala a linha e já começa a gravar você; para sozinho no tempo da linha (ou toque para parar).
- Nota de 0 a 100% pelo reconhecimento de voz do navegador: palavras que saíram claras em verde, as que não saíram em laranja, e o que o app entendeu.
- **▶️ Minha voz** e **🎧 Modelo + eu** (a linha e logo depois a sua gravação, para comparar).
- 🐢 Devagar, "Só ouvir", "Só gravar", tradução da linha sob demanda, navegação por linha com a melhor nota de cada uma em cores, e média da música.
- Funciona com "Só o refrão". Melhores notas ficam salvas no aparelho; praticar conta como dia de estudo.
- Sem IA (custo zero) e sem mudança de banco.

## v15 — 2026-10-18 · Conversa
- Nova aba **💬 Conversa** (barra do celular e menu lateral): bate-papo com a IA no seu nível, sobre a música da semana, uma favorita ou um tema do dia a dia.
- Voz: 🎙️ para falar (reconhecimento de voz do navegador) e leitura das respostas em voz alta (opcional).
- Correção gentil: a resposta segue a conversa e mostra "Mais natural: …" com dica curta; dá para escrever em português quando faltar a palavra.
- 🔊, 🐢 e "Traduzir" em cada fala da IA; conversa salva no aparelho.
- Limite diário próprio para a conversa (150 mensagens por padrão), sem consumir o das aulas.
- Sem mudança de banco.

## v14.2 — 2026-10-18 · Correção: "tool_choice ... not supported for this model"
- A ferramenta de resposta estruturada passa a ser oferecida com `tool_choice: auto` (o modelo em uso não aceita uso forçado). Se o modelo responder em texto, o JSON é lido do texto.
- Sem mudança de banco.

## v14.1 — 2026-10-18 · Correção: "Resposta inesperada da IA"
- As três chamadas de IA (aula completa, análise de música e tradução) agora usam saída estruturada (ferramenta da API da Anthropic): a resposta chega como JSON válido, sem quebrar por aspas ou texto extra.
- Limite de resposta maior (8000 tokens); se mesmo assim a resposta for cortada, a mensagem diz isso.
- Tempo máximo de 60 s também na tradução; erro de conexão ou demora com mensagem clara.
- Sem mudança de banco.

## v14 — 2026-10-18 · Aula completa
- **✨ Gerar aula completa** em cada semana e favorita com letra: trechos comentados pela técnica A.M.E. (associação, memorização, expansão), sons difíceis da música com áudio lento (🐢) e curiosidades.
- Versos citados pela IA são conferidos contra a letra real; inventados são descartados.
- A aula é salva com a letra e compartilhada com a família (uma chamada de IA por música); botão para refazer.
- **🎓 Aulas em vídeo**: atalho para aulas no YouTube sobre a música.
- Banco: `0003_aula_completa.sql` (coluna `lesson` em `lyrics`).

## v13 — 2026-10-18 · Estante de discos
- **Trilha como estante**: cada módulo é um disco que abre e fecha; as semanas são faixas numeradas; a semana atual aparece como "tocando agora" (equalizador).
- **Minhas favoritas** viraram um álbum próprio na Trilha (cor framboesa), separado das músicas indicadas por nível; "+ Adicionar" fica dentro dele. A aba Músicas saiu (5 abas no celular).
- **Computador**: menu lateral fixo (Início, Trilha, Cards, Frases, Método, idioma e Ajustes) no lugar da barra de baixo.
- **Início**: "Sua estante" mostra o progresso de cada módulo e das favoritas e abre a Trilha no lugar certo.
- **Semana e música**: caminho no topo (Trilha / Módulo / Semana) e botões de semana anterior e próxima.
- Os módulos abertos ficam lembrados no aparelho.
- Nova identidade: fundo verde-acinzentado (no lugar do bege), tipografia Bricolage Grotesque, números de faixa alinhados.
- Sem mudança de banco.

## v12 — 2026-10-18 · Letras automáticas
- **🔎 Buscar letra automaticamente** na letra bilíngue de cada semana e em Minha música, via LRCLIB (gratuito). Mostra as versões encontradas (álbum, duração, nº de linhas); a escolhida vai para o campo para conferir antes de salvar.
- Letras só sincronizadas (formato LRC) são convertidas em texto simples.
- Em Minha música, a duração é preenchida sozinha (melhora a medição de palavras por minuto).
- Fornecedor isolado em `lib/lyrics-provider.ts`: trocar por um licenciado no futuro muda um arquivo só.
- Sem mudança de banco.

## v11 — 2026-10-18 · Nativo no celular + acabamento
Aplicadas as skills mobile-native e emil-design-eng (Emil Kowalski, MIT). Sem mudança de banco.
- Campo de tradução da letra em 16px: o iPhone não dá mais zoom ao digitar.
- Duração da música com teclado decimal (aceita 3:45, 3.45, 3,45): o teclado numérico do iPhone não tinha ":".
- Cabeçalho e barra inferior respeitam o notch e a barra do iPhone (safe areas); o último card não fica mais escondido.
- Barra de status com a cor do cabeçalho, clara ou escura conforme o sistema.
- Sem flash cinza ao tocar; resposta imediata ao toque (escala sutil de 0,97 em ~140 ms) em botões, cards e abas.
- Sem seleção de texto ao segurar botões, dias do roteiro e o flashcard (o texto volta a ser selecionável depois de revelar).
- Resposta do card, tradução da IA e aviso de erro entram com opacidade e 6 px de deslocamento; barra de progresso desliza.
- "Semana completa" aparece com um pequeno destaque.
- Dias do roteiro acessíveis por teclado e leitor de tela (checkbox).
- Hover só em computador com mouse; movimento reduzido respeitado (prefers-reduced-motion).
- Teclados certos: e-mail sem maiúscula, código da família em maiúsculas, tecla "ir/próximo".

## v10 — 2026-10-18 · Minha música
- Nova aba **🎤 Músicas**: cole a letra de uma música que você ama e a IA mede o nível (1–4), calibrada pelas músicas da trilha, com sinais de velocidade, vocabulário, tempos verbais e gírias (e palavras por minuto, se informar a duração).
- Aula gerada pela IA: tema, explicação, caça-palavras e 8–10 cards com exemplos originais.
- Comparação com o seu nível: 🟢 no nível / i+1, 🔵 abaixo, 🟠 acima, sem nunca bloquear.
- Músicas acima do nível abrem no modo **só o refrão** (detectado pelas linhas repetidas, sem IA).
- Sugestões reais do mesmo artista, com botão para ouvir no YouTube e "+ Adicionar" já preenchido.
- Roteiro de 7 dias para cada música; cards entram na revisão com prioridade (frases e músicas suas antes da trilha).
- ⚙️ **Meu nível** por idioma (automático pela trilha ou manual).
- Músicas visíveis para a família; apagar remove letra e cards.
- Login: tela orienta a tocar no link do e-mail (o código aparece só com SMTP próprio).
- Build não quebra mais se faltarem as variáveis do Supabase (o erro aparece na tela, com instrução).
- Barra inferior: Início · Trilha · Músicas · Cards · Frases · Método.

## v9 — 2026-10-18 · Fundação
- App reescrito em **Next.js + React** (antes: um único `index.html`).
- **Login por e-mail** (código de 6 dígitos ou link, sem senha) via Supabase.
- **Progresso sincronizado** entre aparelhos; cada pessoa tem a própria conta.
- **Família com código de convite**: letras e traduções da IA compartilhadas; progresso, frases e respostas continuam individuais.
- **Importação automática** do progresso salvo no aparelho pelas versões v1–v8.
- **Conteúdo no banco**: músicas e cards editáveis sem deploy (`content/*.json` → `npm run seed`).
- IA: acesso só com login (fim do código de acesso), **limite diário por pessoa** e registro de uso na tabela `ai_usage`.
- Instalável na tela inicial (manifest + ícone).

## v8 — 2026-10-17
- Tradução da letra por IA (função `api/translate.js` na Vercel, API do Claude).
- Letra bilíngue com dois modos: **Exercício** (você digita, a IA fica escondida e aparece com 👁️) e **Leitura** (letra + tradução da IA).
- Contador de linhas traduzidas por você; "Conferir todas com a IA".
- Campo de código de acesso da IA em ⚙️; número da versão no rodapé de ⚙️.

## v7
- Letra bilíngue: colar a letra, tradução linha a linha, 🔊 por linha, ➕ vira card.

## v6
- Italiano: Módulo 2 · Itália de hoje (semanas 11–17: Jovanotti, Måneskin, Mahmood, Gabbani, Angelina Mango).

## v5
- Tela inicial para escolher idioma; curso de alemão com 10 semanas; progresso separado por idioma.

## v4
- Ajustes para três adultos (sugestões de imersão).

## v3
- Contador de imersão diária, Dia 6 como substituição guiada, cards "só áudio", campo de cena/contexto.

## v2
- Escolha automática da melhor voz e seletor de voz em ⚙️.

## v1
- Primeira versão: 10 semanas de italiano, roteiro de 7 dias, cards com revisão espaçada, perfis.
