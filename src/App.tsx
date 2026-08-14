import { useState, useRef } from 'react'
import SongForm from './components/SongForm'
import SetlistForm from './components/SetlistForm'
import ThemePanel from './components/ThemePanel'
import SlideCard from './components/SlideCard'
import SetlistResults from './components/SetlistResults'
import DatabasePanel from './components/DatabasePanel'
import SetlistHistory from './components/SetlistHistory'
import ProjectionPanel from './components/ProjectionPanel'
import UpdateNotifier from './components/UpdateNotifier'
import type { Slide, SlideTheme, GenerateSlidesResult, SetlistEntry, CachedSong, SavedSetlist, SetlistSongEntry } from './types'

const DEFAULT_THEME: SlideTheme = {
  background: '#000000',
  textColor: '#FFFFFF',
  footerColor: '#9AA0A6',
  fontSize: 40,
  footerFontSize: 14,
  uppercaseLyrics: false,
  uppercaseFooter: false
}

type Banner = { kind: 'warn' | 'error' | 'ok' | 'info'; msg: string } | null

type SongResult = {
  result: GenerateSlidesResult
  error?: string
}

type AppMode = 'single' | 'setlist'

export default function App() {
  const [mode, setMode] = useState<AppMode>('single')
  const [slides, setSlides] = useState<Slide[]>([])
  const [song, setSong] = useState('')
  const [author, setAuthor] = useState('')
  const [theme, setTheme] = useState<SlideTheme>(DEFAULT_THEME)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<Banner>(null)
  const [source, setSource] = useState<string>('')
  const [showDb, setShowDb] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showProjection, setShowProjection] = useState(false)
  const [exporting, setExporting] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Setlist state
  const [setlistResults, setSetlistResults] = useState<SongResult[]>([])
  const [setlistProgress, setSetlistProgress] = useState<{ current: number; total: number; song: string } | null>(null)
  const [eventTitle, setEventTitle] = useState('')

  const footerRaw = song && author ? `${song} — ${author}` : ''
  const footer = theme.uppercaseFooter ? footerRaw.toUpperCase() : footerRaw

  // ---- Modo música única ----
  const handleGenerateSingle = async (p: {
    song: string
    author: string
    language: string
    model: string
    tryWeb: boolean
    manualLyrics?: string
  }) => {
    setLoading(true)
    setBanner({
      kind: 'info',
      msg: p.manualLyrics
        ? 'Estruturando a letra manual em slides com a IA…'
        : 'Buscando letra e estruturando slides com a IA…'
    })
    try {
      const res: GenerateSlidesResult = await window.holy.generateSlides(p)
      setSlides(res.slides)
      setSong(res.song)
      setAuthor(res.author)
      setSource(
        res.fromCache
          ? 'cache local'
          : res.lyricsSource === 'letras.mus.br'
            ? 'letras.mus.br'
            : res.lyricsSource === 'manual'
              ? 'entrada manual'
              : 'IA local (não verificado)'
      )
      if (res.warning) {
        setBanner({ kind: 'warn', msg: res.warning })
      } else {
        setBanner({
          kind: 'ok',
          msg: res.fromCache
            ? `Letra do cache local. ${res.slides.length} slides.`
            : `Letra obtida de ${res.lyricsSource}. ${res.slides.length} slides gerados. Revise antes de exportar.`
        })
      }
    } catch (e: unknown) {
      setBanner({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }

  // ---- Modo setlist ----
  const handleGenerateSetlist = async (
    songs: { song: string; author: string; lyricsHint?: string }[],
    evTitle: string
  ) => {
    setLoading(true)
    setSetlistResults([])
    setEventTitle(evTitle)
    setBanner({ kind: 'info', msg: `Processando ${songs.length} músicas…` })
    const results: SongResult[] = []
    const language = 'pt-BR'
    const model = 'qwen3:8b-q4_K_M'

    for (let i = 0; i < songs.length; i++) {
      const s = songs[i]
      setSetlistProgress({ current: i + 1, total: songs.length, song: `${s.song} — ${s.author}` })
      try {
        const res: GenerateSlidesResult = await window.holy.generateSlides({
          song: s.song,
          author: s.author,
          language,
          model,
          tryWeb: true,
          useCache: true,
          lyricsHint: s.lyricsHint
        })
        results.push({ result: res })
      } catch (e: unknown) {
        results.push({
          result: {
            slides: [],
            lyricsSource: 'llm',
            lyricsRaw: '',
            song: s.song,
            author: s.author,
            fromCache: false
          },
          error: e instanceof Error ? e.message : String(e)
        })
      }
      setSetlistResults([...results])
    }

    setSetlistProgress(null)
    setLoading(false)
    const okCount = results.filter((r) => !r.error).length
    const failCount = results.length - okCount
    if (failCount === 0) {
      setBanner({ kind: 'ok', msg: `${okCount} música(s) processada(s) com sucesso. Pronto para exportar.` })
    } else {
      setBanner({
        kind: 'warn',
        msg: `${okCount} processada(s), ${failCount} com erro. Você pode exportar as que funcionaram.`
      })
    }

    // Salva no histórico automaticamente
    try {
      const entries: SetlistSongEntry[] = results.map((r) => ({
        song: r.result.song,
        author: r.result.author,
        slides: r.result.slides,
        source: r.result.fromCache ? 'cache' : r.result.lyricsSource,
        error: r.error
      }))
      await window.holy.saveSetlist(evTitle, songs, entries)
    } catch {
      // erro ao salvar histórico não é crítico
    }
  }

  const handleLoadSetlist = (saved: SavedSetlist) => {
    setMode('setlist')
    setEventTitle(saved.eventTitle)
    // Carrega os resultados diretamente (sem reprocessar)
    const results: SongResult[] = saved.results.map((entry) => {
      if (entry.error) {
        return {
          result: {
            slides: entry.slides || [],
            lyricsSource: 'llm',
            lyricsRaw: '',
            song: entry.song,
            author: entry.author,
            fromCache: false
          },
          error: entry.error
        }
      }
      return {
        result: {
          slides: entry.slides,
          lyricsSource: entry.source as GenerateSlidesResult['lyricsSource'],
          lyricsRaw: '',
          song: entry.song,
          author: entry.author,
          fromCache: entry.source === 'cache'
        }
      }
    })
    setSetlistResults(results)
    setBanner({
      kind: 'info',
      msg: `Setlist "${saved.eventTitle || 'sem título'}" carregado do histórico. ${results.filter((r) => !r.error).length} músicas. Você pode editar e exportar, ou gerar novamente para atualizar as letras.`
    })
  }

  const handleEditSetlistEntry = (index: number, newSlides: Slide[]) => {
    setSetlistResults((prev) =>
      prev.map((sr, i) =>
        i === index ? { ...sr, result: { ...sr.result, slides: newSlides } } : sr
      )
    )
    // Salva a edição no banco automaticamente
    const sr = setlistResults[index]
    if (sr && !sr.error) {
      const r = sr.result
      window.holy.saveCachedSong({
        song: r.song,
        author: r.author,
        language: 'pt-BR',
        lyrics: r.lyricsRaw || '',
        slides: newSlides,
        source: r.lyricsSource,
        approved: true, // edição manual aprova automaticamente
        updatedAt: new Date().toISOString()
      }).catch(() => {})
    }
  }

  // Salva os slides editados no banco (modo música única)
  const handleSaveSlidesToCache = async () => {
    if (!slides.length || !song) return
    try {
      await window.holy.saveCachedSong({
        song,
        author,
        language: 'pt-BR',
        lyrics: '',
        slides,
        source: source.includes('banco') ? 'letras.mus.br' : (source as 'letras.mus.br' | 'llm' | 'manual'),
        approved: true,
        updatedAt: new Date().toISOString()
      })
      setBanner({ kind: 'ok', msg: `Slides salvos no banco: ${song} — ${author}` })
    } catch {
      setBanner({ kind: 'error', msg: 'Erro ao salvar slides no banco.' })
    }
  }

  const handleExportSetlist = async () => {
    const valid = setlistResults.filter((r) => !r.error && r.result.slides.length > 0)
    if (valid.length === 0) return
    setExporting(true)
    setBanner(null)
    try {
      const defaultName = eventTitle || `Setlist ${new Date().toLocaleDateString('pt-BR')}`
      const { path } = await window.holy.showSaveDialog(defaultName)
      if (!path) {
        setExporting(false)
        return
      }
      const entries: SetlistEntry[] = valid.map((r) => ({
        song: r.result.song,
        author: r.result.author,
        slides: r.result.slides
      }))
      const res = await window.holy.exportSetlistPptx({
        entries,
        theme,
        outputPath: path,
        eventTitle: eventTitle || undefined
      })
      setBanner({ kind: 'ok', msg: `Arquivo salvo: ${res.path}` })
    } catch (e: unknown) {
      setBanner({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setExporting(false)
    }
  }

  // ---- Operações de slide (modo único) ----
  const updateSlide = (i: number, s: Slide) =>
    setSlides((prev) => prev.map((x, idx) => (idx === i ? s : x)))
  const deleteSlide = (i: number) => setSlides((prev) => prev.filter((_, idx) => idx !== i))
  const moveUp = (i: number) =>
    setSlides((prev) => {
      if (i === 0) return prev
      const next = [...prev]
      ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
      return next
    })
  const moveDown = (i: number) =>
    setSlides((prev) => {
      if (i === prev.length - 1) return prev
      const next = [...prev]
      ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
      return next
    })
  const splitSlide = (i: number) =>
    setSlides((prev) => {
      const target = prev[i]
      if (target.lines.length < 2) return prev
      const mid = Math.ceil(target.lines.length / 2)
      const a = { lines: target.lines.slice(0, mid) }
      const b = { lines: target.lines.slice(mid) }
      const next = [...prev]
      next.splice(i, 1, a, b)
      return next
    })
  const addSlide = () => setSlides((prev) => [...prev, { lines: [''] }])
  const mergeWithPrev = (i: number) =>
    setSlides((prev) => {
      if (i === 0) return prev
      const next = [...prev]
      next[i - 1] = { lines: [...next[i - 1].lines, ...next[i].lines] }
      next.splice(i, 1)
      return next
    })

  const handleDragStart = (i: number) => { dragIndex.current = i }
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    setDragOverIndex(i)
  }
  const handleDrop = (i: number) => {
    const from = dragIndex.current
    dragIndex.current = null
    setDragOverIndex(null)
    if (from === null || from === i) return
    setSlides((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(i, 0, moved)
      return next
    })
  }
  const handleDragEnd = () => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  const handleExportSingle = async () => {
    if (!slides.length || !song) return
    setExporting(true)
    setBanner(null)
    try {
      const { path } = await window.holy.showSaveDialog(`${song} - ${author}`)
      if (!path) {
        setExporting(false)
        return
      }
      const res = await window.holy.exportPptx({ slides, song, author, theme, outputPath: path })
      setBanner({ kind: 'ok', msg: `Arquivo salvo: ${res.path}` })
    } catch (e: unknown) {
      setBanner({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setExporting(false)
    }
  }

  const canExportSetlist = setlistResults.some((r) => !r.error && r.result.slides.length > 0)

  const handleUseCachedSong = (cached: CachedSong) => {
    setMode('single')
    setShowDb(false)
    setSlides(cached.slides)
    setSong(cached.song)
    setAuthor(cached.author)
    setSource(`banco local (${cached.source}${cached.approved ? ', aprovada' : ''})`)
    setBanner({ kind: 'ok', msg: `Música carregada do banco: ${cached.song} — ${cached.author}. ${cached.slides.length} slides.` })
  }

  return (
    <div className="app">
      <div className="appbar">
        <div className="title">
          Holy<span>Music</span>
        </div>
        <div className="spacer" />
        {source && mode === 'single' && <div className="status">Fonte: {source}</div>}
        {mode === 'setlist' && setlistResults.length > 0 && (
          <div className="status">
            {setlistResults.filter((r) => !r.error).length}/{setlistResults.length} músicas
          </div>
        )}
        <UpdateNotifier />
        <button className="ghost" onClick={() => setShowDb(true)} title="Ver músicas salvas">
          🎵 Banco
        </button>
        <button className="ghost" onClick={() => setShowHistory(true)} title="Ver setlists anteriores">
          📋 Histórico
        </button>
        {((mode === 'single' && slides.length > 0) || (mode === 'setlist' && setlistResults.some((r) => !r.error && r.result.slides.length > 0))) && (
          <button className="ghost" onClick={() => setShowProjection(true)} title="Projetar em tela externa">
            📺 Projetar
          </button>
        )}
        {mode === 'single' ? (
          <>
            <button
              className="ghost"
              onClick={handleSaveSlidesToCache}
              disabled={!slides.length || !song}
              title="Salvar slides editados no banco local"
            >
              💾 Salvar
            </button>
            <button
              className="primary"
              onClick={handleExportSingle}
              disabled={!slides.length || exporting || !song}
            >
              {exporting ? <><span className="spinner" /> Exportando…</> : '⬇ Exportar PPTX'}
            </button>
          </>
        ) : (
          <button
            className="primary"
            onClick={handleExportSetlist}
            disabled={!canExportSetlist || exporting || loading}
          >
            {exporting ? <><span className="spinner" /> Exportando…</> : '⬇ Exportar setlist PPTX'}
          </button>
        )}
      </div>

      <aside className="sidebar">
        {/* Toggle de modo */}
        <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMode('single')}
            style={{
              flex: 1,
              borderRadius: 0,
              background: mode === 'single' ? 'var(--accent)' : 'var(--panel-2)',
              color: mode === 'single' ? 'white' : 'var(--text)',
              fontWeight: mode === 'single' ? 600 : 400,
              border: 'none'
            }}
          >
            Música única
          </button>
          <button
            onClick={() => setMode('setlist')}
            style={{
              flex: 1,
              borderRadius: 0,
              background: mode === 'setlist' ? 'var(--accent)' : 'var(--panel-2)',
              color: mode === 'setlist' ? 'white' : 'var(--text)',
              fontWeight: mode === 'setlist' ? 600 : 400,
              border: 'none'
            }}
          >
            Setlist
          </button>
        </div>

        {mode === 'single' ? (
          <SongForm onGenerate={handleGenerateSingle} loading={loading} />
        ) : (
          <SetlistForm
            onGenerate={handleGenerateSetlist}
            loading={loading}
            progress={setlistProgress}
          />
        )}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
        <ThemePanel theme={theme} onChange={setTheme} />
      </aside>

      <main className="main">
        {banner && <div className={`banner ${banner.kind}`}>{banner.msg}</div>}

        {mode === 'single' ? (
          slides.length === 0 ? (
            <div className="empty">
              <div className="big">♪</div>
              <div>Digite o nome da música e o autor à esquerda</div>
              <div className="muted">A IA vai buscar a letra e montar os slides automaticamente</div>
            </div>
          ) : (
            <>
              <div className="slides-grid">
                {slides.map((s, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: dragOverIndex === i ? 0.4 : 1,
                      outline: dragOverIndex === i ? '2px dashed var(--accent)' : 'none',
                      borderRadius: 10
                    }}
                  >
                    <SlideCard
                      index={i}
                      total={slides.length}
                      slide={s}
                      theme={theme}
                      footer={footer}
                      onChange={(ns) => updateSlide(i, ns)}
                      onDelete={() => deleteSlide(i)}
                      onMoveUp={() => moveUp(i)}
                      onMoveDown={() => moveDown(i)}
                      onSplit={() => splitSlide(i)}
                      onMergePrev={() => mergeWithPrev(i)}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
                <button onClick={addSlide}>+ Adicionar slide</button>
                <span className="muted">Dica: arraste os cards para reordenar os slides</span>
              </div>
            </>
          )
        ) : (
          setlistResults.length === 0 ? (
            <div className="empty">
              <div className="big">♪</div>
              <div>Cole a lista de músicas do culto à esquerda</div>
              <div className="muted">A IA vai buscar e estruturar todas as letras de uma vez</div>
            </div>
          ) : (
            <SetlistResults
              results={setlistResults}
              theme={theme}
              onEdit={handleEditSetlistEntry}
            />
          )
        )}
      </main>

      {showDb && (
        <DatabasePanel
          onClose={() => setShowDb(false)}
          onUseSong={handleUseCachedSong}
        />
      )}

      {showHistory && (
        <SetlistHistory
          onClose={() => setShowHistory(false)}
          onLoadSetlist={handleLoadSetlist}
        />
      )}

      {showProjection && (
        <ProjectionPanel
          slides={slides}
          song={song}
          author={author}
          theme={theme}
          allSongs={
            mode === 'setlist'
              ? setlistResults
                  .filter((r) => !r.error && r.result.slides.length > 0)
                  .map((r) => ({
                    song: r.result.song,
                    author: r.result.author,
                    slides: r.result.slides
                  }))
              : undefined
          }
          onClose={() => setShowProjection(false)}
        />
      )}
    </div>
  )
}
