# Ascolto em Família

App de estudo de idiomas (italiano e alemão) pelo método natural (Stephen Krashen): uma música por semana, roteiro de escuta de 7 dias, cards com revisão espaçada e frases próprias. Perfis separados para cada pessoa da família.

## Publicar na Vercel

É um site estático (um único `index.html`, sem build).

**Opção 1 — GitHub**
1. Crie um repositório e suba esta pasta.
2. Em vercel.com → *Add New → Project* → importe o repositório.
3. Framework Preset: **Other**. Build e Output: deixe vazio. Deploy.

**Opção 2 — CLI**
```bash
npm i -g vercel
cd ascolto
vercel --prod
```

Depois abra o link no celular e use "Adicionar à tela de início" para ficar como app.

## Como funciona

- **Idiomas**: a tela inicial escolhe entre 🇮🇹 Italiano e 🇩🇪 Deutsch (troque pela bandeira no topo). Cada perfil tem progresso separado por idioma.
- **Perfis**: troque no seletor do topo. Renomeie em ⚙️.
- **Progresso**: salvo no navegador de cada aparelho (localStorage). Cada um usa no próprio celular. Para trocar de aparelho, use Exportar/Importar em ⚙️.
- **Áudio**: os cards usam a voz italiana do próprio celular (🔊).
- **Músicas**: os botões abrem YouTube, Spotify e a busca da letra. As letras não ficam dentro do app.

## Adicionar novas semanas

Edite `COURSES.it.weeks` ou `COURSES.de.weeks` no `index.html`. Para um idioma novo, adicione uma entrada em `COURSES` (nome, bandeira, código de voz e semanas). Cada card é `["italiano", "português", "exemplo IT", "exemplo PT"]`.
