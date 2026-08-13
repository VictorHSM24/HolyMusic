# HolyMusic

Gerador de slides PPTX de letras de músicas com IA local (Ollama) para igreja.

## Stack
- **Electron + Vite + React + TypeScript** (via `electron-vite`)
- **Ollama** local (`qwen3:8b-q4_K_M`) para estruturar letras em slides
- **pptxgenjs** para gerar arquivos `.pptx`
- **electron-builder** para empacotar (NSIS installer + portable)

## Comandos
- `npm run dev` — inicia o app em modo desenvolvimento
- `npm run build` — compila main/preload/renderer
- `npm run dist` — compila + gera instalador NSIS e versão portátil em `dist/`
- `npm run dist:nsis` — apenas instalador NSIS
- `npm run dist:portable` — apenas versão portátil

## ⚠️ Nota importante: ELECTRON_RUN_AS_NODE
O ambiente deste computador tem a variável `ELECTRON_RUN_AS_NODE=1` definida globalmente,
que faz o Electron rodar como Node puro (sem API do Electron). O script `scripts/dev.mjs`
remove essa variável antes de iniciar o dev server. Se o app falhar com
`Cannot read properties of undefined (reading 'whenReady')`, verifique se essa variável
está definida e remova-a.

## Arquitetura
- `electron/main.ts` — processo principal do Electron, cria a janela
- `electron/preload.ts` — bridge seguro entre main e renderer (expõe `window.holy`)
- `electron/services/ollama.ts` — cliente HTTP para a API do Ollama (localhost:11434)
- `electron/services/lyrics.ts` — scraper de letras.mus.br
- `electron/services/slides.ts` — orquestra busca de letra + estruturação em slides via LLM
- `electron/services/pptx.ts` — geração do arquivo PPTX
- `electron/services/ipc.ts` — registro dos handlers IPC
- `src/` — UI React (formulário, editor de slides, preview, exportação)

## Fluxo
1. Usuário digita música + autor + idioma
2. App busca letra em letras.mus.br (scraper HTTP)
3. Se não encontrar, o Qwen3 gera a letra (com aviso para revisão)
4. O Qwen3 estrutura a letra em slides (máx 4 linhas por slide) via JSON mode
5. Usuário edita/reordena/divide slides no preview
6. Usuário exporta para .pptx com tema visual configurável
