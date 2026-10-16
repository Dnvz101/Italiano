# Ascolto em Família

App de estudo de idiomas (italiano e alemão) pelo método natural (Stephen Krashen): uma música por semana, roteiro de escuta de 7 dias, cards com revisão espaçada e frases próprias. Perfis separados para cada pessoa da família.

## Publicar na Vercel

É um site estático (`index.html`, sem build) com uma função serverless (`api/translate.js`) para a tradução por IA. A Vercel detecta as duas coisas sozinha.

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

### Ativar a tradução por IA
1. Crie uma chave em console.anthropic.com.
2. Na Vercel: *Project → Settings → Environment Variables*:
   - `ANTHROPIC_API_KEY` = sua chave
   - `ACCESS_CODE` = um código qualquer (ex.: `familia2026`), para ninguém de fora usar sua API
   - `ANTHROPIC_MODEL` (opcional) = padrão `claude-haiku-5-5`
3. Faça um novo deploy.
4. No app, em ⚙️, digite o mesmo código de acesso em cada celular.

Custo: com o Haiku, traduzir uma letra inteira custa uma fração de centavo.

Depois abra o link no celular e use "Adicionar à tela de início" para ficar como app.

## Como funciona

- **Idiomas**: a tela inicial escolhe entre 🇮🇹 Italiano e 🇩🇪 Deutsch (troque pela bandeira no topo). Cada perfil tem progresso separado por idioma.
- **Perfis**: troque no seletor do topo. Renomeie em ⚙️.
- **Progresso**: salvo no navegador de cada aparelho (localStorage). Cada um usa no próprio celular. Para trocar de aparelho, use Exportar/Importar em ⚙️.
- **Áudio**: os cards usam a voz italiana do próprio celular (🔊).
- **Músicas**: os botões abrem YouTube, Spotify e a busca da letra. As letras não ficam dentro do app.

## Adicionar novas semanas

Edite `COURSES.it.weeks` ou `COURSES.de.weeks` no `index.html`. Para um idioma novo, adicione uma entrada em `COURSES` (nome, bandeira, código de voz e semanas). Cada card é `["italiano", "português", "exemplo IT", "exemplo PT"]`.
