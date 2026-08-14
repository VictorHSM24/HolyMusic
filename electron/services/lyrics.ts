// Busca e extrai letras no letras.mus.br
// Estratégia em camadas (sem depender de buscador externo):
// 1. Tenta a URL direta com slug: /{artist-slug}/{song-slug}/
// 2. Se falhar, busca na página do artista e procura a música nos links
// 3. Se falhar, tenta variantes de ortografia do autor (K<->C, Y<->I, W<->V)
// 4. Se falhar, busca só por título da música (ignorando autor) + valida com lyricsHint
// 5. Se falhar, tenta DuckDuckGo (fallback, às vezes bloqueia com CAPTCHA)

export type FetchResult = {
  found: boolean
  lyrics: string | null
  url: string
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Gera variações de slug removendo artigos/preposições que o letras.mus.br
// às vezes omite. Ex: "Trazendo a Arca" → ["trazendo-a-arca", "trazendo-arca"]
function slugVariants(s: string): string[] {
  const base = slugify(s)
  const variants = [base]
  // Remove artigos e preposições isolados (a, o, e, de, da, do, das, dos)
  const withoutArticles = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+(a|o|e|de|da|do|das|dos|as|os)\s+/gi, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (withoutArticles !== base) variants.push(withoutArticles)
  // Versão sem o primeiro artigo também (ex: "A igreja vem" → "igreja-vem")
  const withoutLeading = base.replace(/^(a|o|e|as|os|de|da|do|das|dos)-/, '')
  if (withoutLeading !== base) variants.push(withoutLeading)
  // Remove colaborações: "Heloisa Rosa e Fernandinho" → "heloisa-rosa"
  const collabMatch = s.match(/^(.+?)\s+e\s+\S+/i)
  if (collabMatch) {
    const solo = slugify(collabMatch[1])
    if (solo !== base) variants.push(solo)
  }
  return [...new Set(variants)]
}

// Gera variações de ortografia comuns em nomes brasileiros:
// K <-> C (Lukas / Lucas), Y <-> I (Lony / Loni), W <-> V (Wagner / Vagner)
function orthographicVariants(s: string): string[] {
  const variants = new Set<string>([s])
  // K <-> C
  if (/k/i.test(s)) variants.add(s.replace(/k/gi, (m) => (m === 'K' ? 'C' : 'c')))
  if (/c/i.test(s)) {
    // só troca C por K antes de vogais que fazem sentido (ca->ka, co->ko, cu->ku)
    // mas não ce->ke nem ci->ki (som diferente)
    variants.add(s.replace(/c([aou])/gi, (_m, v) => 'k' + v))
  }
  // Y <-> I
  if (/y/i.test(s)) variants.add(s.replace(/y/gi, (m) => (m === 'Y' ? 'I' : 'i')))
  if (/i/i.test(s)) variants.add(s.replace(/i/gi, (m) => (m === 'I' ? 'Y' : 'y')))
  // W <-> V (no início ou depois de consoante)
  if (/w/i.test(s)) variants.add(s.replace(/w/gi, (m) => (m === 'W' ? 'V' : 'v')))
  if (/v/i.test(s)) variants.add(s.replace(/v/gi, (m) => (m === 'V' ? 'W' : 'w')))
  // PH -> F (Phil -> Fil)
  if (/ph/i.test(s)) variants.add(s.replace(/ph/gi, (m) => (m === 'PH' ? 'F' : 'f')))
  return [...variants]
}

// Aliases conhecidos de artistas gospel brasileiros
// (nome comum / abreviação -> nome canônico no letras.mus.br)
const ARTIST_ALIASES: Record<string, string> = {
  'fhop': 'Florianópolis House Of Prayer',
  'fhop music': 'Florianópolis House Of Prayer',
  'fhopping': 'Florianópolis House Of Prayer',
  'diante do trono': 'Ana Paula Valadão',
  'dtt': 'Diante do Trono',
  'trazendo arca': 'Trazendo a Arca',
  'ministerio avivah': 'Avivah',
  'avivah': 'Avivah',
  'a igreja music': 'A Igreja Music',
  'igreja music': 'A Igreja Music'
}

function resolveAlias(author: string): string[] {
  const lower = author.toLowerCase().trim()
  const aliases = [author]
  for (const [key, val] of Object.entries(ARTIST_ALIASES)) {
    if (lower === key || slugify(lower) === slugify(key)) {
      aliases.push(val)
    }
  }
  return [...new Set(aliases)]
}

function extractLyrics(html: string): string | null {
  const patterns: RegExp[] = [
    /<div[^>]*class="lyric-original"[^>]*>([\s\S]*?)<\/div>\s*<(?:nav|div|\/section|\/article)/i,
    /<div[^>]*class="lyric-original"[^>]*>([\s\S]*?)<\/div>\s*<nav/i,
    /<div[^>]*class="lyric-original"[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="lyric-translation"[^>]*>([\s\S]*?)<\/div>\s*<(?:nav|div)/i
  ]

  for (const pat of patterns) {
    const m = html.match(pat)
    if (m && m[1]) {
      const text = htmlToLyrics(m[1])
      if (text.trim().length > 20) return text.trim()
    }
  }
  return null
}

function htmlToLyrics(fragment: string): string {
  return fragment
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'pt-BR,pt;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

// Estratégia 1: URL direta com slug (tenta variações de slug do autor e da música)
async function tryDirectUrl(author: string, song: string): Promise<FetchResult> {
  const authorSlugs = slugVariants(author)
  const songSlugs = slugVariants(song)
  for (const aSlug of authorSlugs) {
    for (const sSlug of songSlugs) {
      const url = `https://www.letras.mus.br/${aSlug}/${sSlug}/`
      const html = await fetchPage(url)
      if (html) {
        const lyrics = extractLyrics(html)
        if (lyrics) return { found: true, lyrics, url }
      }
    }
  }
  return { found: false, lyrics: null, url: `https://www.letras.mus.br/${authorSlugs[0]}/${songSlugs[0]}/` }
}

// Estratégia 2: buscar na página do artista (tenta variações de slug do autor)
async function tryArtistPage(author: string, song: string): Promise<FetchResult> {
  const authorSlugs = slugVariants(author)
  const songSlugs = slugVariants(song)
  const songLower = song.toLowerCase().trim()

  for (const artistSlug of authorSlugs) {
    const artistUrl = `https://www.letras.mus.br/${artistSlug}/`
    const html = await fetchPage(artistUrl)
    if (!html) continue

    // Procura por links do tipo /{artist}/{anything}/ com texto (título da música)
    const linkPattern = new RegExp(
      `href="(/${artistSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([a-z0-9-]+)/)"[^>]*>([\\s\\S]*?)(?:</a>|</h)`,
      'gi'
    )
    const matches = [...html.matchAll(linkPattern)]

    const exclude = ['discografia', 'ouvir', 'mais_acessadas', 'radio', 'print', 'significado']
    const songLinks = matches
      .map((m) => ({
        path: m[1],
        slug: m[2],
        title: m[3].replace(/<[^>]+>/g, '').trim().toLowerCase()
      }))
      .filter((l) => !exclude.some((e) => l.slug.includes(e)) && l.slug.length > 0)

    // Prioridade 1: slug exato (qualquer variação)
    let best = songLinks.find((l) => songSlugs.includes(l.slug))
    // Prioridade 2: título do link igual ao nome da música
    if (!best) best = songLinks.find((l) => l.title === songLower)
    // Prioridade 3: título do link contém o nome da música (ou vice-versa)
    if (!best)
      best = songLinks.find(
        (l) => (l.title && l.title.includes(songLower)) || songLower.includes(l.title)
      )
    // Prioridade 4: slug parecido (Levenshtein <= 2)
    if (!best) best = songLinks.find((l) => songSlugs.some((ss) => levenshtein(l.slug, ss) <= 2))
    // Prioridade 5: slug parcial
    if (!best)
      best = songLinks.find((l) => songSlugs.some((ss) => l.slug.includes(ss) || ss.includes(l.slug)))

    if (best) {
      const fullUrl = `https://www.letras.mus.br${best.path}`
      const songHtml = await fetchPage(fullUrl)
      if (songHtml) {
        const lyrics = extractLyrics(songHtml)
        if (lyrics) return { found: true, lyrics, url: fullUrl }
      }
    }
  }

  return { found: false, lyrics: null, url: `https://www.letras.mus.br/${authorSlugs[0]}/` }
}

// Estratégia 3: DuckDuckGo (fallback, pode ser bloqueado)
async function tryDuckDuckGo(song: string, author: string): Promise<FetchResult> {
  const query = encodeURIComponent(`${song} ${author} site:letras.mus.br`)
  const url = `https://html.duckduckgo.com/html/?q=${query}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15000)
    })
    if (!res.ok) return { found: false, lyrics: null, url: '' }
    const html = await res.text()

    // Verifica se DDG bloqueou com CAPTCHA
    if (/anomal|captcha|robot/i.test(html)) return { found: false, lyrics: null, url: '' }

    const links: string[] = []
    for (const m of html.matchAll(/uddg=([^&"]+)/g)) {
      try {
        const decoded = decodeURIComponent(m[1])
        if (decoded.includes('letras.mus.br')) links.push(decoded)
      } catch {
        // ignore
      }
    }
    for (const m of html.matchAll(/href="(https?:\/\/(?:www\.)?letras\.mus\.br\/[^"]+)"/g)) {
      links.push(m[1])
    }

    const songLinks = links.filter((l) => {
      try {
        const u = new URL(l)
        const parts = u.pathname.split('/').filter(Boolean)
        if (parts.length !== 2) return false
        if (['discografia', 'mais-acessadas', 'busca', 'search', 'contribuicoes', 'letra'].includes(parts[0]))
          return false
        return true
      } catch {
        return false
      }
    })

    if (songLinks.length > 0) {
      const songHtml = await fetchPage(songLinks[0])
      if (songHtml) {
        const lyrics = extractLyrics(songHtml)
        if (lyrics) return { found: true, lyrics, url: songLinks[0] }
      }
    }
    return { found: false, lyrics: null, url: '' }
  } catch {
    return { found: false, lyrics: null, url: '' }
  }
}

// Distância de Levenshtein para correspondência fuzzy de slugs
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1]
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// Estratégia 4: Busca só por título da música (ignora autor)
// Usa a busca interna do letras.mus.br e valida o resultado com lyricsHint se disponível
async function trySearchByTitleOnly(song: string, lyricsHint?: string): Promise<FetchResult> {
  const query = encodeURIComponent(song)
  const searchUrl = `https://www.letras.mus.br/busca/?q=${query}`
  try {
    const html = await fetchPage(searchUrl)
    if (!html) return { found: false, lyrics: null, url: '' }

    // Extrai links de músicas da página de busca
    const linkPattern = /href="(https?:\/\/(?:www\.)?letras\.mus\.br\/([a-z0-9-]+)\/([a-z0-9-]+)\/?)"/gi
    const matches = [...html.matchAll(linkPattern)]
    const exclude = ['discografia', 'mais-acessadas', 'busca', 'search', 'contribuicoes', 'letra', 'ouvir', 'print', 'significado', 'radio']

    const candidates = matches
      .map((m) => ({ url: m[1], artistSlug: m[2], songSlug: m[3] }))
      .filter((l) => !exclude.some((e) => l.songSlug.includes(e) || l.artistSlug.includes(e)))
      .filter((l, i, arr) => arr.findIndex((x) => x.url === l.url) === i) // dedupe

    const songSlugs = slugVariants(song)
    const songLower = song.toLowerCase().trim()

    // Prioriza matches por slug da música
    const sorted = candidates.sort((a, b) => {
      const aMatch = songSlugs.includes(a.songSlug) ? 0 : 1
      const bMatch = songSlugs.includes(b.songSlug) ? 0 : 1
      return aMatch - bMatch
    })

    // Tenta os primeiros candidatos
    for (const cand of sorted.slice(0, 5)) {
      const songHtml = await fetchPage(cand.url)
      if (!songHtml) continue
      const lyrics = extractLyrics(songHtml)
      if (!lyrics) continue

      // Se temos um lyricsHint, valida se o trecho aparece na letra
      if (lyricsHint) {
        const hintNormalized = lyricsHint
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\.{2,}/g, '')
          .trim()
        const lyricsNormalized = lyrics
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        // Remove espaços e pontuação do hint para busca flexível
        const hintWords = hintNormalized.split(/\s+/).filter((w) => w.length > 2)
        if (hintWords.length >= 2) {
          const matchCount = hintWords.filter((w) => lyricsNormalized.includes(w)).length
          const matchRatio = matchCount / hintWords.length
          if (matchRatio < 0.4) {
            // Trecho não bate — provavelmente não é a música certa
            continue
          }
        }
      }

      return { found: true, lyrics, url: cand.url }
    }

    return { found: false, lyrics: null, url: '' }
  } catch {
    return { found: false, lyrics: null, url: '' }
  }
}

export async function fetchLyrics(
  author: string,
  song: string,
  _language: string,
  lyricsHint?: string
): Promise<FetchResult> {
  // Resolve aliases (ex: "fhop" -> "Florianópolis House Of Prayer")
  const authorCandidates = resolveAlias(author)

  // 1) URL direta (tenta todas as variações de autor + alias)
  for (const a of authorCandidates) {
    let result = await tryDirectUrl(a, song)
    if (result.found) return result
  }

  // 2) Página do artista (tenta todas as variações de autor + alias)
  for (const a of authorCandidates) {
    let result = await tryArtistPage(a, song)
    if (result.found) return result
  }

  // 3) Variantes de ortografia (K<->C, Y<->I, W<->V, PH<->F)
  for (const a of authorCandidates) {
    const orthoVariants = orthographicVariants(a)
    for (const v of orthoVariants) {
      if (v === a) continue
      let result = await tryDirectUrl(v, song)
      if (result.found) return result
      result = await tryArtistPage(v, song)
      if (result.found) return result
    }
  }

  // 4) Busca só por título (ignora autor), valida com lyricsHint
  let result = await trySearchByTitleOnly(song, lyricsHint)
  if (result.found) return result

  // 5) DuckDuckGo (fallback, pode bloquear com CAPTCHA)
  result = await tryDuckDuckGo(song, author)
  if (result.found) return result

  // Se nada funcionou, retorna o último resultado (com a URL tentada)
  return { found: false, lyrics: null, url: result.url || `https://www.letras.mus.br/${slugify(author)}/${slugify(song)}/` }
}
