import { useState, useEffect } from 'react'

export type ParsedEntry = {
  song: string
  author: string
  lyricsHint?: string
  needsAuthor: boolean
}

type Props = {
  onGenerate: (songs: { song: string; author: string; lyricsHint?: string }[], eventTitle: string) => void
  loading: boolean
  progress: { current: number; total: number; song: string } | null
}

// Lista de artistas gospel brasileiros comuns para sugerir
// Também usada para detectar autores grudados no título da música
const COMMON_ARTISTS = [
  'Diante do Trono',
  'Trazendo a Arca',
  'Anderson Freire',
  'Fernandinho',
  'Alda Célia',
  'Ludmila Ferber',
  'David Quinlan',
  'Asaph Borba',
  'Adhemar de Campos',
  'Cristina Mel',
  'Fernanda Lima',
  'Voz da Verdade',
  'Aline Barros',
  'Pregador Luo',
  'Coral Kemuel',
  'Brasa Church',
  'A Igreja Music',
  'Nívia Soares',
  'Léia Mendes',
  'Raquel Mello',
  'Flordelis',
  'Helena Tannure',
  'Marcus Salles',
  'Renascer Praise',
  'Daniel Dia',
  'Thalles Roberto',
  'Padre Fábio de Melo',
  'Padre Marcelo Rossi',
  'Padre Antônio Maria',
  'Zé Vicente',
  'Pe. Zezinho',
  'Anjos de Resgate',
  'Catedral',
  'Rosa de Saron',
  'Elaine de Jesus',
  'Eyshila',
  'Bruna Karla',
  'Cassiane',
  'Damares',
  'Shirley Carvalhaes',
  'Paz',
  'Coral Resgate',
  'Ministério Cristo Vive',
  'Ministério Koinonya de Louvor',
  'Toque no Altar',
  'Ministério Ribeiro',
  'Julliany Souza',
  'Felipe Rodrigues',
  'Mariana Fagundes',
  'Harpa Cristã',
  'Gabriel Guedes',
  'Sara Oliveira',
  'Léo Fonseca',
  'Heloisa Rosa',
  'Heloísa Rosa',
  'Lucas Agostinho',
  'Lukas Agostinho',
  'Ana Paula Valadão',
  'Soraya Moraes',
  'Guilherme Baptista',
  'Florianópolis House Of Prayer',
  'Ministério Avivah',
  'Avivah',
  'SeaLeopard',
  'Kemuel'
]

// Notas de versão que NÃO são autores (devem ser ignoradas)
const VERSION_NOTES = [
  'original', 'ao vivo', 'playback', 'versão', 'version', 'cover',
  'tradução', 'translation', 'remix', 'acústico', 'acustico',
  'demo', 'bonus', 'estúdio', 'estudio', 'live', 'mtv'
]

// Normaliza texto para comparação (sem acentos, sem case)
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

// Detecta se um texto entre parênteses é uma tonalidade musical
function isTonality(text: string): boolean {
  const cleaned = text.trim().replace(/[?\s]/g, '')
  // C, C#, Db, Am, F#m, Bbm, etc.
  return /^[A-G][#b]?m{0,2}$/.test(cleaned)
}

// Detecta se um texto entre parênteses é uma nota de versão (não autor)
function isVersionNote(text: string): boolean {
  const normalized = normalize(text)
  return VERSION_NOTES.some((v) => normalized === v || normalized.startsWith(v))
}

// Tenta detectar um nome de artista conhecido grudado no título da música
// Ex: "Ele nos ama Léo Fonseca" → song="Ele nos ama", author="Léo Fonseca"
// Ex: "Yeshua heloisa Rosa e Fernandinho" → song="Yeshua", author="Heloisa Rosa e Fernandinho"
function tryExtractArtistFromText(text: string): { song: string; author: string } | null {
  const textLower = text.toLowerCase()
  // Ordena artistas por tamanho (maiores primeiro) para match mais específico
  const sorted = [...COMMON_ARTISTS].sort((a, b) => b.length - a.length)
  for (const artist of sorted) {
    const artistNorm = normalize(artist)
    // Busca o nome do artista no texto (case-insensitive, sem acento)
    const idx = textLower.indexOf(artistNorm.toLowerCase())
    // Também tenta sem normalização (para preservar acentos do texto original)
    const idxRaw = text.toLowerCase().indexOf(artist.toLowerCase())
    if (idx >= 0 || idxRaw >= 0) {
      const realIdx = idxRaw >= 0 ? idxRaw : idx
      const song = text.substring(0, realIdx).trim()
      const author = text.substring(realIdx).trim()
      // O que sobrou como song deve ter pelo menos 2 chars
      if (song.length >= 2) {
        return { song, author }
      }
    }
  }
  return null
}

function parseLine(part: string): ParsedEntry {
  let text = part.trim()
  let lyricsHint: string | undefined
  let author = ''

  // Extrai trecho entre aspas duplas ("então vou levantar....")
  const quoteMatch = text.match(/"([^"]+)"/)
  if (quoteMatch) {
    lyricsHint = quoteMatch[1].replace(/\.{2,}/g, '').trim()
    text = text.replace(/"[^"]+"/, '').trim()
  }

  // Extrai conteúdo entre parênteses
  const parens = [...text.matchAll(/\(([^)]+)\)/g)]
  for (const p of parens) {
    const content = p[1].trim()
    if (isTonality(content)) {
      // É tonalidade, remove
      text = text.replace(p[0], '')
    } else if (isVersionNote(content)) {
      // É nota de versão (original, ao vivo, etc), remove sem usar como autor
      text = text.replace(p[0], '')
    } else {
      // Pode ser autor (ex: "diante do trono")
      author = content.replace(/\.{2,}/g, '').trim()
      text = text.replace(p[0], '')
    }
  }

  // Remove reticências e pontos extras
  text = text.replace(/\.{2,}/g, '').replace(/\s+\.+\s*/g, ' ').trim()

  // Remove separadores sobrando no início/fim
  text = text.replace(/^[-–:]\s*/, '').replace(/\s*[-–:]$/, '').trim()

  // Se sobrou " - autor" no texto (formato tradicional), separa
  const dashMatch = text.match(/^(.+?)\s+[-–]\s+(.+)$/)
  if (dashMatch && !author) {
    text = dashMatch[1].trim()
    author = dashMatch[2].trim()
  }

  // Se ainda não tem autor, tenta detectar artista conhecido grudado no título
  // Ex: "Ele nos ama Léo Fonseca" → song="Ele nos ama", author="Léo Fonseca"
  if (!author) {
    const extracted = tryExtractArtistFromText(text)
    if (extracted) {
      text = extracted.song
      author = extracted.author
    }
  }

  return {
    song: text,
    author,
    lyricsHint,
    needsAuthor: !author
  }
}

export function parseSetlist(text: string): ParsedEntry[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const entries: ParsedEntry[] = []

  for (const line of lines) {
    // Remove numeração no início: "1. ", "1) ", "1 - "
    const cleaned = line.replace(/^\d+[\.\)\-]\s*/, '')

    // Divide por + para medleys
    const parts = cleaned.split(/\s*\+\s*/)

    for (const part of parts) {
      const entry = parseLine(part)
      if (entry.song && entry.song.length > 1) {
        entries.push(entry)
      }
    }
  }
  return entries
}

export default function SetlistForm({ onGenerate, loading, progress }: Props) {
  const [text, setText] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [parsed, setParsed] = useState<ParsedEntry[]>([])
  const [step, setStep] = useState<'input' | 'confirm'>('input')
  const [authorInputs, setAuthorInputs] = useState<Record<number, string>>({})
  const [cachedAuthors, setCachedAuthors] = useState<string[]>([])

  useEffect(() => {
    // Carrega autores do cache para sugerir
    window.holy.listCachedSongs().then((songs) => {
      const authors = [...new Set(songs.map((s) => s.author))].sort()
      setCachedAuthors(authors)
    }).catch(() => {})
  }, [])

  const allSuggestions = [...new Set([...COMMON_ARTISTS, ...cachedAuthors])].sort()

  const handleParse = () => {
    const entries = parseSetlist(text)
    setParsed(entries)
    // Inicializa inputs de autor vazios para os que precisam
    const inputs: Record<number, string> = {}
    entries.forEach((e, i) => {
      if (e.needsAuthor) inputs[i] = ''
    })
    setAuthorInputs(inputs)
    setStep(entries.some((e) => e.needsAuthor) ? 'confirm' : 'input')
  }

  const handleConfirmAndGenerate = () => {
    const songs = parsed.map((e, i) => ({
      song: e.song,
      author: e.needsAuthor ? (authorInputs[i] || '').trim() : e.author,
      lyricsHint: e.lyricsHint
    }))
    onGenerate(songs, eventTitle.trim())
  }

  const needsAuthorEntries = parsed
    .map((e, i) => ({ ...e, index: i }))
    .filter((e) => e.needsAuthor)

  const allAuthorsFilled = needsAuthorEntries.every((e) => (authorInputs[e.index] || '').trim().length > 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading || !text.trim()) return
    handleParse()
  }

  const handleBack = () => {
    setStep('input')
  }

  if (step === 'confirm') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3>Confirmar autores</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {needsAuthorEntries.length} música(s) sem autor. Selecione ou digite o autor de cada uma:
        </p>

        {parsed.map((entry, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: entry.needsAuthor ? 'var(--panel-2)' : 'transparent'
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {i + 1}. {entry.song}
            </div>
            {entry.lyricsHint && (
              <div className="muted" style={{ fontSize: 12, marginBottom: 6, fontStyle: 'italic' }}>
                Trecho: "{entry.lyricsHint}"
              </div>
            )}
            {entry.needsAuthor ? (
              <div className="field">
                <label>Autor / Artista</label>
                <input
                  list={`authors-${i}`}
                  value={authorInputs[i] || ''}
                  onChange={(e) => setAuthorInputs({ ...authorInputs, [i]: e.target.value })}
                  placeholder="Digite ou selecione o autor"
                  autoFocus={i === needsAuthorEntries[0]?.index}
                />
                <datalist id={`authors-${i}`}>
                  {allSuggestions.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>
                Autor: <strong style={{ color: 'var(--ok)' }}>{entry.author}</strong> ✓
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" onClick={handleBack} disabled={loading}>
            ← Voltar e editar lista
          </button>
          <button
            className="primary"
            onClick={handleConfirmAndGenerate}
            disabled={loading || !allAuthorsFilled}
          >
            {loading ? <><span className="spinner" /> Gerando…</> : 'Gerar setlist'}
          </button>
        </div>

        {progress && (
          <div className="banner info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" />
            <span>
              Processando {progress.current}/{progress.total}: <strong>{progress.song}</strong>
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3>Setlist do culto</h3>
      <div className="field">
        <label>Nome do culto / evento (opcional)</label>
        <input
          value={eventTitle}
          onChange={(e) => setEventTitle(e.target.value)}
          placeholder="Ex: Culto de Louvor - Domingo"
        />
      </div>
      <div className="field">
        <label>Lista de músicas (uma por linha)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Cole a lista como recebida dos ministros.\n\n'}
          style={{ minHeight: 180, fontFamily: 'Consolas, monospace', fontSize: 13 }}
        />
      </div>

      <div className="banner info" style={{ fontSize: 12 }}>
        <strong>Como o parser funciona:</strong>
        <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
          <li><code>+</code> separa músicas de medley</li>
          <li>Texto entre <code>"aspas"</code> = trecho para ajudar a identificar</li>
          <li><code>(C)</code>, <code>(F#)</code> = tonalidades (ignoradas)</li>
          <li><code>(autor)</code> entre parênteses = autor da música</li>
          <li>Músicas sem autor serão pedidas na próxima tela</li>
        </ul>
      </div>

      {progress && (
        <div className="banner info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="spinner" />
          <span>
            Processando {progress.current}/{progress.total}: <strong>{progress.song}</strong>
          </span>
        </div>
      )}

      <button type="submit" className="primary" disabled={loading || !text.trim()}>
        Analisar setlist
      </button>
    </form>
  )
}
