import { chatJson, chatText } from './ollama.js'
import { fetchLyrics } from './lyrics.js'
import { getCachedSong, saveCachedSong } from './db.js'

export type Slide = { lines: string[] }

export type GenerateParams = {
  song: string
  author: string
  language: string
  model: string
  tryWeb: boolean
  /** Letra colada manualmente pelo usuário (opcional). Se presente, pula busca web e LLM. */
  manualLyrics?: string
  /** Se true, usa cache do banco se disponível (aprovado). Padrão: true. */
  useCache?: boolean
  /** Trecho da letra fornecido pelo usuário para ajudar a identificar a música (opcional). */
  lyricsHint?: string
}

export type GenerateResult = {
  slides: Slide[]
  lyricsSource: 'letras.mus.br' | 'llm' | 'manual' | 'cache'
  lyricsRaw: string
  song: string
  author: string
  warning?: string
  fromCache: boolean
}

const STRUCTURE_SYSTEM = `Você é um assistente que organiza letras de música em slides para projeção em igreja.
Regras OBRIGATÓRIAS:
- Divida a letra em slides de modo que cada slide caiba com fonte GRANDE (50-60px) em tela 1920x1080.
- Isso significa NO MÁXIMO 4 linhas por slide, preferindo 2-3 linhas.
- NUNCA quebre uma mesma linha no meio. Cada linha é uma unidade indivisível.
- Mantenha estrofes/coro/ponte juntos quando couberem (até 4 linhas); se não couber, divida entre slides.
- Não invente texto. Use EXATAMENTE as linhas fornecidas na letra, apenas reorganize em grupos.
- Remova linhas vazias desnecessárias, mas preserve a ordem original.
- Não adicione títulos como "Coro:" ou "Verso:" — apenas as linhas da letra.
- Responda SEMPRE em JSON no formato: {"slides": [{"lines": ["linha1", "linha2"]}]}.

Exemplo de saída:
{"slides": [{"lines": ["Graça, graça de Deus", "Graça, graça sem fim"]}, {"lines": ["Onde o pecado abundou", "A graça superabundou"]}]}`

const GENERATE_LYRICS_SYSTEM = `Você é um assistente que recupera letras de músicas cristãs/gospel.

REGRAS CRÍTICAS — VIOLAR QUALQUER UMA É INACEITÁVEL:
1. Se você conhece a letra EXATA da música com 100% de certeza, devolva-a em texto puro.
2. Se você NÃO tem certeza absoluta de cada palavra, ou se há qualquer dúvida sobre qualquer trecho,
   responda EXATAMENTE esta palavra e mais nada: NAO_ENCONTRADA
3. É INFINITAMENTE MELHOR responder NAO_ENCONTRADA do que devolver uma letra parcial, errada,
   ou "parecida". Uma letra errada projetada na igreja é um problema grave.
4. NUNCA invente, complete ou "reconstrua" trechos que você não lembra com certeza.
5. NUNCA devolva uma letra "genérica" ou "no estilo de" — só a letra real serve.
6. Não adicione comentários, explicações, títulos ou o nome da música — apenas a letra ou NAO_ENCONTRADA.

Lembre-se: você está ajudando uma igreja a projetar letras durante o culto. Uma letra errada
causaria confusão e constrangimento público. Na dúvida, sempre responda NAO_ENCONTRADA.`

function cleanLyrics(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function safeParseJson(content: string): unknown {
  let txt = content.trim()
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) txt = fence[1].trim()
  const start = txt.indexOf('{')
  const end = txt.lastIndexOf('}')
  if (start >= 0 && end > start) txt = txt.slice(start, end + 1)
  return JSON.parse(txt)
}

export async function generateSlides(params: GenerateParams): Promise<GenerateResult> {
  const { song, author, language, model, tryWeb, manualLyrics, useCache = true, lyricsHint } = params
  let lyricsRaw = ''
  let source: GenerateResult['lyricsSource'] = 'llm'
  const warnings: string[] = []
  let fromCache = false

  // 0) Banco local — se já temos a letra aprovada em cache, usa direto
  if (useCache && !manualLyrics) {
    const cached = getCachedSong(song, author, language)
    if (cached && cached.approved && cached.slides.length > 0) {
      return {
        slides: cached.slides,
        lyricsSource: 'cache',
        lyricsRaw: cached.lyrics,
        song,
        author,
        warning: undefined,
        fromCache: true
      }
    }
  }

  // 0b) Letra manual — usuário colou a letra diretamente
  if (manualLyrics && manualLyrics.trim().length > 10) {
    lyricsRaw = cleanLyrics(manualLyrics)
    source = 'manual'
  }

  // 1) Tenta buscar no letras.mus.br
  if (!lyricsRaw && tryWeb) {
    const fetched = await fetchLyrics(author, song, language, lyricsHint)
    if (fetched.found && fetched.lyrics) {
      lyricsRaw = cleanLyrics(fetched.lyrics)
      source = 'letras.mus.br'
    } else if (fetched.url) {
      warnings.push(
        `Não foi possível encontrar a letra em letras.mus.br (URL tentada: ${fetched.url}).`
      )
    } else {
      warnings.push(
        'Não foi possível encontrar a letra em letras.mus.br (a busca não retornou resultados).'
      )
    }
  }

  // 2) Fallback: pede a letra ao LLM — usa lyricsHint como contexto extra
  if (!lyricsRaw) {
    const langName = language === 'pt-BR' ? 'português brasileiro' : language
    let prompt = `Música: "${song}"\nAutor/Artista: "${author}"\nIdioma: ${langName}`
    if (lyricsHint) {
      prompt += `\nTrecho conhecido: "${lyricsHint}"`
    }
    prompt += `\n\nVocê conhece a letra EXATA e COMPLETA desta música? Se houver QUALQUER dúvida, responda NAO_ENCONTRADA. Caso contrário, devolva apenas a letra.`
    const lyricsResp = await chatText(
      model,
      GENERATE_LYRICS_SYSTEM,
      prompt
    )
    const cleaned = cleanLyrics(lyricsResp)
    if (!cleaned || /NAO_ENCONTRADA/i.test(cleaned)) {
      throw new Error(
        `Não foi possível obter a letra de "${song}" de ${author}.\n\n` +
          `A busca no letras.mus.br não encontrou a música, e o modelo de IA não conhece a letra com certeza suficiente.\n\n` +
          `Você pode colar a letra manualmente: clique em "Colar letra manualmente" no painel esquerdo, cole a letra e clique em "Gerar slides".`
      )
    }
    lyricsRaw = cleaned
    source = 'llm'
    warnings.push(
      '⚠️ Letra recuperada pelo modelo de IA (não verificada em fonte externa). Revise CUIDADOSAMENTE cada palavra antes de projetar. Se houver qualquer erro, use "Colar letra manualmente".'
    )
  }

  // 3) Estrutura em slides via LLM (JSON)
  const structured = await chatJson(
    model,
    STRUCTURE_SYSTEM,
    `Organize a seguinte letra em slides (máx 4 linhas por slide, preferindo 2-3).\n\nMúsica: ${song}\nAutor: ${author}\n\nLETRA:\n"""\n${lyricsRaw}\n"""`
  )

  let slides: Slide[] = []
  try {
    const parsed = safeParseJson(structured) as { slides?: { lines?: string[] }[] }
    slides = (parsed.slides || [])
      .map((s) => ({ lines: (s.lines || []).map((l) => l.trim()).filter(Boolean) }))
      .filter((s) => s.lines.length > 0)
  } catch {
    // JSON inválido — fallback abaixo
  }

  // Fallback: se o LLM retornou slides vazios OU o JSON falhou, divide manualmente
  if (slides.length === 0) {
    const lines = lyricsRaw.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    for (let i = 0; i < lines.length; i += 4) {
      slides.push({ lines: lines.slice(i, i + 4) })
    }
  }

  if (slides.length === 0) {
    throw new Error('O modelo não conseguiu estruturar a letra em slides. Tente editar manualmente.')
  }

  // Salva no banco local para reuso futuro (não aprovado ainda — o usuário precisa revisar)
  if (source !== 'manual' || true) {
    try {
      saveCachedSong({
        song,
        author,
        language,
        lyrics: lyricsRaw,
        slides,
        source,
        approved: source === 'letras.mus.br', // aprova automaticamente se veio da web
        updatedAt: new Date().toISOString()
      })
    } catch {
      // erro ao salvar cache não é crítico
    }
  }

  return {
    slides,
    lyricsSource: source,
    lyricsRaw,
    song,
    author,
    warning: warnings.join(' ') || undefined,
    fromCache
  }
}
