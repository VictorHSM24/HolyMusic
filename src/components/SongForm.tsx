import { useEffect, useState } from 'react'

type Props = {
  onGenerate: (p: {
    song: string
    author: string
    language: string
    model: string
    tryWeb: boolean
    manualLyrics?: string
  }) => void
  loading: boolean
}

export default function SongForm({ onGenerate, loading }: Props) {
  const [song, setSong] = useState('')
  const [author, setAuthor] = useState('')
  const [language, setLanguage] = useState('pt-BR')
  const [model, setModel] = useState('qwen3:8b-q4_K_M')
  const [models, setModels] = useState<string[]>([])
  const [tryWeb, setTryWeb] = useState(true)
  const [modelError, setModelError] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [manualLyrics, setManualLyrics] = useState('')

  useEffect(() => {
    window.holy
      .listOllamaModels()
      .then((m) => {
        setModels(m)
        if (m.length && !m.includes(model)) setModel(m[0])
      })
      .catch((e: unknown) => setModelError(e instanceof Error ? e.message : String(e)))
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!song.trim() || !author.trim() || loading) return
    const payload: {
      song: string
      author: string
      language: string
      model: string
      tryWeb: boolean
      manualLyrics?: string
    } = { song: song.trim(), author: author.trim(), language, model, tryWeb }
    if (showManual && manualLyrics.trim().length > 10) {
      payload.manualLyrics = manualLyrics
      payload.tryWeb = false
    }
    onGenerate(payload)
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3>Música</h3>
      <div className="field">
        <label>Nome da música</label>
        <input
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="Ex: Celebre"
          autoFocus
        />
      </div>
      <div className="field">
        <label>Autor / Artista</label>
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Ex: Trazendo a Arca"
        />
      </div>
      <div className="row">
        <div className="field">
          <label>Idioma</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="pt-BR">Português (BR)</option>
            <option value="en-US">Inglês</option>
            <option value="es-ES">Espanhol</option>
          </select>
        </div>
        <div className="field">
          <label>Modelo Ollama</label>
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.length === 0 && <option value={model}>{model}</option>}
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!showManual && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={tryWeb}
            onChange={(e) => setTryWeb(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Buscar letra em letras.mus.br primeiro
        </label>
      )}

      <button
        type="button"
        className="ghost"
        onClick={() => setShowManual(!showManual)}
        style={{ fontSize: 13, padding: '6px 10px' }}
      >
        {showManual ? '− Ocultar letra manual' : '+ Colar letra manualmente'}
      </button>

      {showManual && (
        <div className="field">
          <label>Letra (cole aqui a letra completa)</label>
          <textarea
            value={manualLyrics}
            onChange={(e) => setManualLyrics(e.target.value)}
            placeholder="Cole aqui a letra da música&#10;Separando as estrofes com uma linha em branco"
            style={{ minHeight: 140, fontFamily: 'Consolas, monospace', fontSize: 13 }}
          />
          <p className="muted" style={{ marginTop: 4 }}>
            A IA vai apenas dividir a letra em slides — não vai gerar nem buscar a letra.
          </p>
        </div>
      )}

      {modelError && <div className="banner error">{modelError}</div>}

      <button
        type="submit"
        className="primary"
        disabled={loading || !song.trim() || !author.trim() || (showManual && manualLyrics.trim().length < 10)}
      >
        {loading ? <><span className="spinner" /> Gerando…</> : 'Gerar slides'}
      </button>
    </form>
  )
}
