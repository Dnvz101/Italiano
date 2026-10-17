# Histórico de versões — Ascolto em Família

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
