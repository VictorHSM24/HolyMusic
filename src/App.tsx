import { useState, useRef } from 'react'
import SongForm from './components/SongForm'
import ThemePanel from './components/ThemePanel'
import SlideCard from './components/SlideCard'
import type { Slide, SlideTheme, GenerateSlidesResult } from './types'

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

export default function App() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [song, setSong] = useState('')
  const [author, setAuthor] = useState('')
  const [theme, setTheme] = useState<SlideTheme>(DEFAULT_THEME)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<Banner>(null)
  const [source, setSource] = useState<string>('')
  const [exporting, setExporting] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const footerRaw = song && author ? `${song} — ${author}` : ''
  const footer = theme.uppercaseFooter ? footerRaw.toUpperCase() : footerRaw

  const handleGenerate = async (p: {
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
        res.lyricsSource === 'letras.mus.br'
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
          msg: `Letra obtida de ${res.lyricsSource}. ${res.slides.length} slides gerados. Revise antes de exportar.`
        })
      }
    } catch (e: unknown) {
      setBanner({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoading(false)
    }
  }

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

  // Drag and drop
  const handleDragStart = (i: number) => {
    dragIndex.current = i
  }
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

  const handleExport = async () => {
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

  return (
    <div className="app">
      <div className="appbar">
        <div className="title">
          Holy<span>Music</span>
        </div>
        <div className="spacer" />
        {source && <div className="status">Fonte: {source}</div>}
        <button
          className="primary"
          onClick={handleExport}
          disabled={!slides.length || exporting || !song}
        >
          {exporting ? <><span className="spinner" /> Exportando…</> : '⬇ Exportar PPTX'}
        </button>
      </div>

      <aside className="sidebar">
        <SongForm onGenerate={handleGenerate} loading={loading} />
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
        <ThemePanel theme={theme} onChange={setTheme} />
      </aside>

      <main className="main">
        {banner && <div className={`banner ${banner.kind}`}>{banner.msg}</div>}

        {slides.length === 0 ? (
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
        )}
      </main>
    </div>
  )
}
