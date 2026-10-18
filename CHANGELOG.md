# Histórico de versões — Ascolto em Família

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
