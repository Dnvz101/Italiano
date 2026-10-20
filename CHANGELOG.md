# Histórico de versões — Ascolto em Família

## v28.4 — 2026-10-20 · Botão de escrita com cara de botão
- No verso dos cards de kana e kanji, "✍️ Treinar a escrita" virou um botão de verdade (pílula clara com borda); aberto, vira "✕ Fechar a escrita".

## v28.3 — 2026-10-20 · Barra de baixo presa de verdade no iPhone
- No celular, quem rola agora é só a área de conteúdo; a barra de baixo faz parte do layout em vez de "flutuar" (position:fixed). Some o vão em branco que aparecia embaixo da barra no Safari do iPhone ao rolar até o fim. No computador nada muda.
- Rolagens do app (trocar de tela, abas da aula, conversa, progresso da IA) passam por `lib/scroll.ts`, que rola o lugar certo nos dois casos.

## v28.2 — 2026-10-20 · Direção dos cards à mão
- A escolha da direção (idioma → PT, PT → idioma, só áudio) fica logo abaixo do card durante a revisão e troca na hora, no card que está na tela. Ao escolher "Só áudio", o card atual já é falado.

## v28.1 — 2026-10-20 · Escrita no lugar de Minhas frases (japonês)
- No japonês, a aba de baixo vira **Escrita** e a tela "Escrita e pronúncia" tem ✍️ Escrever (treino de escrever kana de memória) e あ Kana e sons. "Minhas frases" sai só do japonês; italiano e alemão continuam iguais.
- "Virar card" no japonês avisa que o card vai para a revisão da aba Cards.

## v28 — 2026-10-20 · Escrever kana e kanji com o dedo
- Quadro para escrever com o dedo, com o modelo bem clarinho por baixo ou **de memória** (só o romaji aparece).
- **▶ Ordem:** anima os traços um por um, numerados, na ordem certa.
- Confere sozinho quando a quantidade de traços bate: nota de 0 a 100, cada traço pintado de verde, laranja ou vermelho, e dicas ("o traço 3 foi feito ao contrário", "este parece ser o traço 2", "esta letra tem 3 traços; você fez 2"). Tamanho e posição não importam: dá para escrever pequeno ou num canto.
- Onde: Frases → Kana e sons (em cada letra e na aba nova "✍️ Escrever", que sorteia as letras mais fracas), aba Letras das semanas de kana ("✍️ Escrever de memória") e no verso dos cards de hiragana, katakana e kanji ("✍️ treinar a escrita").
- Traços de 92 kana e dos 96 kanji do baralho, do projeto KanjiVG (CC BY-SA 3.0).

## v27 — 2026-10-19 · Japonês começa pelo kana
- **Módulo de kana antes das músicas:** semana 1 = あ Hiragana, semana 2 = ア Katakana. As músicas passam a ser as semanas 3 a 12.
- Cada semana de kana tem roteiro próprio de 7 dias (uma linha do alfabeto por dia, os tracinhos ゛゜, o traço ー, escrever o próprio nome), aba **Letras** (ouvir, repetir e ganhar nota), **Aula** e **Praticar** (grade colorida: firme, aprendendo, ainda não viu).
- **Lembrete diário:** cartão "Treino de kana de hoje" no Início e pontinho vermelho na aba Cards enquanto houver treino pendente. Terminar o treino do dia marca sozinho o próximo dia do roteiro.
- Agora entram de verdade só 10 letras novas por dia (5 kanji); antes, cada sessão nova trazia mais 10.
- Começar uma música antes de terminar o kana pede confirmação. Semanas de kana não contam no limite do plano grátis.
- Se o banco tiver uma versão antiga do curso (com menos semanas), o app usa a versão nova embutida.

## v26 — 2026-10-19 · Painel administrativo, planos e cards de kana/kanji
- **Painel administrativo** (só para dnvz.jp@gmail.com): visão geral, usuários com plano editável, gastos com IA por dia/tipo/modelo/pessoa (com preços editáveis) e configuração dos planos. Precisa rodar `supabase/migrations/0004_admin_planos.sql`.
- **Planos Grátis × Apoiador × Família/VIP**, com validade. Limites do grátis configuráveis e **desligados por padrão**: semanas por idioma (🔒 + convite sobre a prévia apagada), mensagens de conversa por dia e músicas próprias. Os bloqueios de IA acontecem no servidor antes de gastar tokens, e o banco recusa músicas acima do limite.
- Botão "☕ Apoiar" (link configurável: Ko-fi, Buy Me a Coffee, PayPay…) no convite e em Configurações → Seu plano.
- **Cards do japonês com submenu:** 🗂️ Músicas, あ Hiragana (45), ア Katakana (45) e 漢 Kanji (96 básicos: números, dias, pessoas, natureza, placas da rua, verbos e adjetivos). Cada um com a própria revisão espaçada e um contador do que está para revisar.

## v25 — 2026-10-19 · Japonês 🇯🇵
- **Novo idioma: 日本語.** Trilha de 10 semanas em 2 módulos (Primeiros passos e J-pop): さんぽ, 上を向いて歩こう, 世界に一つだけの花, 涙そうそう, ハナミズキ, 糸, チェリー, Lemon, Pretender e 夜に駆ける. Cada uma com tema, aula e 10 cards do dia a dia (konbini, trabalho, perguntas).
- **Visual vermelho, preto e branco** só no japonês: botões pretos, destaques em vermelho, bandeira do Japão e ilustrações próprias (onigiri de fone, monte Fuji, torii, disco e sakura) no início, na trilha e na semana.
- **Furigana e romaji** em cards, aula, revisão, frases, conversa e letras. A voz lê o texto sem os colchetes.
- **Shadowing e "Repetir" no japonês:** nota por sílaba, comparando pela leitura em hiragana (o servidor transcreve a fala e devolve também em kana).
- **Kana e sons** (aba Frases): hiragana e katakana com exemplo para cada letra, e os sons que pegam os brasileiros (つ, R, ふ, vogal longa, っ, ん, vogais que somem…).
- **Câmera** com os 80 objetos em japonês (sem artigo nem gênero) e a leitura em kana.
- **IA no japonês:** aula, análise de música, tradução (com leitura), conversa (aceita escrever em romaji) e perfil musical com estilos japoneses (J-pop, anime, city pop…).
- Idiomas centralizados em `lib/langs.ts`: abrir um idioma novo agora é um arquivo de conteúdo + uma linha.
- O conteúdo embutido entra sozinho quando um idioma ainda não está no banco.

## v24.1 — 2026-10-19 · Sempre claro
- O app fica sempre no tema claro, mesmo com o celular no modo escuro (barra do navegador também clara).

## v24 — 2026-10-19 · Redesign fiel às referências
- **Tipografia:** Nunito (hospedada no próprio app, sem Google Fonts) com escala fixa: página 22, card 17, texto 15, metadado 12,5–13,5, botão 15,5; pesos 900/800/600/500.
- **Tokens globais:** fundo quase branco, menta/verde-água, texto azul-escuro, cinza-azulado, raios 12/18/24, sombras bem leves no lugar de contornos pesados. Vale para todas as telas.
- **Biblioteca de ícones nova** (`components/icons`): SVGs individuais duotone (traço + menta) para Início, Trilha, Conversa, Cards, Frases, Método, Câmera, Calendário, Memorização, Música, Play, Seta, Aula, Documento, Lupa, Fones, Vinil, Configurações, Microfone, YouTube, Spotify, nível e bandeiras 🇮🇹/🇩🇪 em SVG. Barra de baixo, menu lateral, abas da aula e títulos usam essa biblioteca.
- **Ilustrações 3D** recortadas da folha de referência como arquivos separados (`public/illustrations`): câmera (Explorar), balão (Conversa vazia), vinil (convite do perfil musical).
- **Tela da aula** como na referência: cabeçalho com o banner do disco e da flor à direita, nível em pílula, botões YouTube/Spotify/Aulas brancos; abas Roteiro/Letra/Aula/Cards num cartão único com divisórias e aba ativa em menta; cards da aula com ícone em círculo menta.
- **Trilha** com o banner do disco de fone.
- Sem mudança de lógica, dados ou banco.

## v23 — 2026-10-19 · Novo visual do Início
- Visual do Início refeito a partir do protótipo: topo com casinha + "Ascolto Italiano" grande, bandeira em pílula e engrenagem em círculo.
- Banner **estático** do italiano (pizza, Vespa e moka diante do Coliseu), com o "Ciao, {nome}!" no balão. O alemão continua com o vídeo.
- "Explorar com a câmera" com ícone em bloco e seta em círculo.
- Números do dia em três cartões coloridos (verde, azul, lilás) com ícones; tocar em "cards hoje" abre a revisão.
- "Tocando agora" com nota musical, barra de progresso em degradê e botão em pílula (▶ Continuar semana →).
- "Sua estante" com ícone de livro e atalho para a Trilha; barra de baixo com sublinhado na aba ativa.
- Tudo funciona no tema escuro. Sem mudança de banco.

## v22.2 — 2026-10-18 · Desfazer semana começada sem querer
- No Roteiro de uma semana já começada aparece **"↩︎ Comecei esta semana sem querer: desfazer"**: tira a semana da lista e a semana atual volta a ser a anterior (o Início volta a mostrar a certa).
- Começar uma semana pulando outras agora pede confirmação ("Você está na semana 1. Quer mesmo começar a semana 4?").
- Sem mudança de banco.

## v22.1 — 2026-10-18 · Salvar a letra já prepara a aula
- Na letra de cada semana, o botão agora é **✨ Salvar e preparar a aula**: salva a letra e, ao mesmo tempo, gera a tradução da IA linha por linha e a **aula completa** (antes era preciso ir à aba 🎓 Aula e apertar outro botão).
- Anel de progresso enquanto prepara e aviso no fim ("Tradução e aula prontas! A aula completa está na aba 🎓 Aula").
- Opção "Preparar também a tradução e a aula completa (IA)" para quem quer só salvar a letra.
- Só gasta IA no que falta: se a tradução já existe, não traduz de novo; a aula é refeita apenas se a letra mudou.
- Se a pessoa trocar de aba no meio, tudo continua e é salvo do mesmo jeito.
- Sem mudança de banco.

## v22 — 2026-10-18 · Explorar com a câmera (realidade aumentada)
- Novo **📷 Explorar com a câmera** (cartão no Início): aponte a câmera para as coisas da casa e o nome aparece **flutuando em cima de cada objeto**, no idioma, com o artigo colorido pelo gênero (der/die/das; il/la/lo/i/gli/le).
- Reconhece 80 objetos do dia a dia (xícara, cadeira, mesa, celular, gato, banana, geladeira, livro…), com nome em italiano e alemão revisado.
- Tocar na etiqueta: ouve a palavra, **🎙️ Repetir** com nota (mesma avaliação do Shadowing) e **➕ Virar card**.
- Jogo de coleção: cada objeto novo dá "🎉 Nova descoberta!" (falada em voz alta) e entra em **Sua coleção: X de 80**. Botão **⏸️ Congelar** para tocar nas etiquetas com calma.
- Tudo roda **no próprio celular** (TensorFlow.js + COCO-SSD): as imagens da câmera não saem do aparelho e não há custo de IA. O detector (~5 MB) é baixado do Google na primeira vez; carregado só nesta tela (não pesa no resto do app).
- Sem mudança de banco.

## v21.2 — 2026-10-18 · Boas-vindas do alemão
- O alemão ganhou o seu vídeo: pretzel, caneca de chopp e salsicha, com o **"Hallo, Leandro!"** no balão de fala.
- Cada idioma tem o seu banner (`components/HeroGreeting.tsx`), com a posição do balão ajustada para cada vídeo. O vídeo toca uma vez por idioma em cada sessão.
- Vídeo cortado antes do zoom final, emenda suave, sem som, ~375 KB (`public/media/hero-de.mp4`).
- Sem mudança de banco.

## v21.1 — 2026-10-18 · Vídeo de boas-vindas toca sozinho
- Correção: em alguns celulares aparecia o botão de play. O React não grava o atributo `muted` no HTML e, sem ele, o iPhone recusa tocar sozinho; agora o app marca o vídeo como mudo antes de dar o play.
- O vídeo toca **uma vez** quando o app abre e para no último quadro (com o "Ciao" no balão). Voltar ao Início na mesma sessão mostra a imagem parada; **tocar no cartão repete**.
- Se o celular bloquear vídeo automático (modo economia de bateria), mostra a imagem parada, sem botão de play.
- Sem mudança de banco.

## v21 — 2026-10-18 · Boas-vindas animadas
- No Início (italiano), o "Ciao, Leandro!" agora aparece **dentro do balão de fala** do vídeo animado da turma: a pizza de chapéu de chef, a Vespa e a cafeteira moka.
- Vídeo recortado, sem som, em loop com emenda suave (cross-fade) e comprimido para ~380 KB (`public/media/hero-it.mp4`), com imagem de capa enquanto carrega.
- Toca sozinho e em silêncio (como exige o celular), pausa quando sai da tela ou o app vai para o fundo; com "Reduzir movimento" ligado, mostra só a imagem parada.
- O nome aparece só com o primeiro nome e com inicial maiúscula; nomes longos diminuem a letra para caber no balão.
- Alemão continua com o título normal ("Hallo, …") até ganhar o seu vídeo: basta adicionar `hero-de.mp4` e `hero-de.webp` e uma linha em `components/HeroGreeting.tsx`.
- Sem mudança de banco.

## v20.2 — 2026-10-18 · Pronúncia no iPhone
- Correção: no iPhone, o Alfabeto (e às vezes o Shadowing) dizia "Não entendi". O Safari, gravando e reconhecendo ao mesmo tempo, costuma devolver vazio, principalmente em palavras curtas e letras soltas.
- No iPhone, com `GEMINI_API_KEY` configurada, a avaliação agora é feita pelo servidor, igual ao Android. A gravação do iPhone (mp4/AAC) é aceita.
- Quando não há reconhecimento do navegador (iPhone e Android), a gravação **para sozinha depois de ~1 s de silêncio**, sem precisar tocar para parar.
- Inclui as correções da v20.1 (modelos "lite" do Gemini, erro detalhado e diagnóstico em `/api/transcribe?diag=1`).
- Sem mudança de banco.

## v20.1 — 2026-10-18 · Correção: "a avaliação demorou demais" no Android
- O modelo padrão do Gemini (3.8 Flash) "pensa" antes de responder e estourava o tempo numa simples transcrição. Agora usa modelos **lite** (rápidos, sem raciocínio longo): `gemini-3.5-flash-lite`, e se não existir ou falhar, `gemini-2.5-flash-lite` e `gemini-2.5-flash`. `GEMINI_MODEL` continua tendo prioridade se for definido.
- Mais tempo para a função (60 s) e limite de resposta maior.
- A mensagem de erro agora diz qual modelo falhou e por quê.
- Diagnóstico: logado, abra `/api/transcribe?diag=1` para ver quais modelos respondem e em quanto tempo.
- Sem mudança de banco.

## v20 — 2026-10-18 · Alfabeto e sons
- A aba **Frases** virou **Frases e pronúncia**, com duas partes: ✍️ Minhas frases (como antes) e **🔤 Alfabeto e sons**.
- **Letras**: o alfabeto completo do idioma (italiano: 21 + 5 estrangeiras; alemão: 26 + Ä Ö Ü ß). Cada letra mostra como se diz ("H se diz acca"), uma dica em português, 🔊/🐢 e **🎙️ Repetir** com nota. Embaixo, uma palavra de exemplo com nota própria.
- **Sons difíceis**: os pedaços que travam brasileiros (italiano: ce/ci, che/chi, ge/gi, ghe/ghi, gli, gn, sce/sci, sca/schi, z, dobradas, R vibrado, H mudo, ti/di; alemão: ei, ie, eu/äu, ch de "ich" e de "ach", sch, sp/st, -ig, consoante final, -er, w/v, z, ä/ö/ü, h mudo, s, pf, tsch/qu), cada um com regra curta e 3 palavras para repetir com nota.
- Grade colorida pela melhor nota de cada letra e bolinhas por som; contadores de quantas letras e sons já treinou. Notas ficam no aparelho; treinar conta como dia de estudo.
- A nota do nome da letra aceita as formas que o reconhecimento costuma devolver (ex.: "acca" ou "H").
- Shadowing: quando o reconhecimento termina, a gravação para junto (antes esperava o tempo máximo).
- Usa a mesma avaliação do Shadowing (no Android, pelo Gemini quando configurado). Sem IA da Anthropic e sem mudança de banco.

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
