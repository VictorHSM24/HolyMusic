import { useState, useEffect, useCallback } from 'react'
import type { Slide, SlideTheme, DisplayInfo } from '../types'

type Props = {
  slides: Slide[]
  song: string
  author: string
  theme: SlideTheme
  /** Lista de slides de todas as músicas (para setlist) — opcional */
  allSongs?: { song: string; author: string; slides: Slide[] }[]
  onClose: () => void
}

type FlatSlide = {
  lines: string[]
  footer: string
  songIndex: number
  songName: string
}

export default function ProjectionPanel({ slides, song, author, theme, allSongs, onClose }: Props) {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState(1)
  const [projecting, setProjecting] = useState(false)
  const [blank, setBlank] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Constrói lista flatten de slides (para música única ou setlist)
  const flatSlides: FlatSlide[] = (() => {
    if (allSongs && allSongs.length > 0) {
      const result: FlatSlide[] = []
      allSongs.forEach((s, si) => {
        const footer = theme.uppercaseFooter
          ? `${s.song} — ${s.author}`.toUpperCase()
          : `${s.song} — ${s.author}`
        // Slide de título
        result.push({
          lines: [theme.uppercaseLyrics ? s.song.toUpperCase() : s.song],
          footer: theme.uppercaseFooter ? s.author.toUpperCase() : s.author,
          songIndex: si,
          songName: s.song
        })
        // Slides da letra
        s.slides.forEach((slide) => {
          const lines = theme.uppercaseLyrics
            ? slide.lines.map((l) => l.toUpperCase())
            : slide.lines
          result.push({ lines, footer, songIndex: si, songName: s.song })
        })
      })
      return result
    }
    // Música única
    const footer = theme.uppercaseFooter
      ? `${song} — ${author}`.toUpperCase()
      : `${song} — ${author}`
    return slides.map((slide) => ({
      lines: theme.uppercaseLyrics ? slide.lines.map((l) => l.toUpperCase()) : slide.lines,
      footer,
      songIndex: 0,
      songName: song
    }))
  })()

  // Carrega lista de monitores
  useEffect(() => {
    window.holy.projection.listDisplays().then((d) => {
      setDisplays(d)
      // Pré-seleciona: última tela não-primária (mais provável de ser o projetor)
      const nonPrimary = d.filter((x) => !x.isPrimary)
      if (nonPrimary.length > 0) {
        setSelectedDisplay(nonPrimary[nonPrimary.length - 1].id)
      } else {
        setSelectedDisplay(0)
      }
    })
  }, [])

  // Escuta quando o projetor é fechado
  useEffect(() => {
    const unsubscribe = window.holy.projection.onClosed(() => {
      setProjecting(false)
    })
    return unsubscribe
  }, [])

  // Envia slide atual para o projetor
  const sendToProjector = useCallback(
    (index: number, blankState: boolean) => {
      if (!projecting || index < 0 || index >= flatSlides.length) return
      const slide = flatSlides[index]
      window.holy.projection.update({
        lines: slide.lines,
        footer: slide.footer,
        background: theme.background,
        textColor: theme.textColor,
        footerColor: theme.footerColor,
        fontSize: theme.fontSize,
        footerFontSize: theme.footerFontSize
      })
      if (blankState !== blank) {
        window.holy.projection.blank(blankState)
      }
    },
    [projecting, flatSlides, theme, blank]
  )

  // Atualiza o projetor quando o slide muda
  useEffect(() => {
    if (projecting) {
      sendToProjector(currentIndex, blank)
    }
  }, [currentIndex, projecting, sendToProjector, blank])

  const handleStart = async () => {
    const res = await window.holy.projection.start(selectedDisplay)
    if (res.ok) {
      setProjecting(true)
      setCurrentIndex(0)
      setBlank(false)
    }
  }

  const handleSwitchDisplay = async (newDisplayId: number) => {
    setSelectedDisplay(newDisplayId)
    // Para e reabre no novo display
    await window.holy.projection.stop()
    const res = await window.holy.projection.start(newDisplayId)
    if (res.ok) {
      setProjecting(true)
      // Reenvia o slide atual
      setTimeout(() => sendToProjector(currentIndex, blank), 200)
    }
  }

  const handleStop = async () => {
    await window.holy.projection.stop()
    setProjecting(false)
  }

  const handleBlank = async () => {
    const newBlank = !blank
    setBlank(newBlank)
    await window.holy.projection.blank(newBlank)
  }

  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, flatSlides.length - 1))
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0))
  const goTo = (i: number) => setCurrentIndex(i)

  // Teclado: setas para navegar, B para blank, ESC para fechar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        goPrev()
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        handleBlank()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (projecting) handleStop()
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [projecting, flatSlides.length])

  const currentSlide = flatSlides[currentIndex]
  const nextSlide = flatSlides[currentIndex + 1]
  const previewFontSize = Math.max(10, Math.min(20, theme.fontSize * 0.4))

  // Agrupa slides por música para a lista lateral
  const songsWithRanges: { name: string; start: number; end: number }[] = []
  flatSlides.forEach((s, i) => {
    const last = songsWithRanges[songsWithRanges.length - 1]
    if (!last || last.name !== s.songName) {
      songsWithRanges.push({ name: s.songName, start: i, end: i })
    } else {
      last.end = i
    }
  })

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--bg)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 20px',
          background: 'var(--panel)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <h3 style={{ margin: 0 }}>Projeção ao vivo</h3>
        <span style={{ flex: 1 }} />
        {/* Seletor de tela — sempre visível */}
        <label className="muted" style={{ fontSize: 12 }}>Tela:</label>
        <select
          value={selectedDisplay}
          onChange={(e) => {
            const newId = Number(e.target.value)
            if (projecting) {
              handleSwitchDisplay(newId)
            } else {
              setSelectedDisplay(newId)
            }
          }}
          style={{ padding: '6px 10px', minWidth: 200 }}
        >
          {displays.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        {!projecting ? (
          <button className="primary" onClick={handleStart}>
            ▶ Iniciar projeção
          </button>
        ) : (
          <>
            <button
              className={blank ? 'primary' : 'ghost'}
              onClick={handleBlank}
              title="Tecla B"
            >
              {blank ? '■ Tela preta (ativada)' : '□ Tela preta'}
            </button>
            <button className="ghost" onClick={handleStop} title="Tecla ESC">
              ⏹ Parar projeção
            </button>
          </>
        )}
        <button className="ghost" onClick={onClose}>✕ Fechar</button>
      </div>

      {/* Visualização das telas (quando não está projetando) */}
      {!projecting && displays.length > 0 && (
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--panel-2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap'
          }}
        >
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            {displays.length} tela(s) detectada(s). Clique para selecionar onde projetar:
          </span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {displays.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDisplay(d.id)}
                style={{
                  padding: '10px 16px',
                  border: selectedDisplay === d.id
                    ? '2px solid var(--accent)'
                    : '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selectedDisplay === d.id ? 'rgba(79,140,255,0.1)' : 'var(--panel)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minWidth: 160
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  🖥️ Tela {d.id + 1}
                  {d.isPrimary && <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}> (controle)</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {d.width}×{d.height}
                </div>
                {selectedDisplay === d.id && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                    ✓ Selecionada para projeção
                  </div>
                )}
              </div>
            ))}
          </div>
          {displays.length === 1 && (
            <div className="banner warn" style={{ fontSize: 12, margin: 0 }}>
              Apenas 1 tela detectada. Para projeção, conecte um segundo monitor ou projetor.
              Você ainda pode testar na mesma tela.
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Lista de slides (sidebar) */}
        <div
          style={{
            width: 240,
            borderRight: '1px solid var(--border)',
            overflow: 'auto',
            background: 'var(--panel)',
            flexShrink: 0
          }}
        >
          {songsWithRanges.map((songGroup, sgi) => (
            <div key={sgi}>
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  background: 'var(--panel-2)',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                {songGroup.name}
              </div>
              {flatSlides.slice(songGroup.start, songGroup.end + 1).map((s, i) => {
                const realIndex = songGroup.start + i
                const isActive = realIndex === currentIndex
                return (
                  <div
                    key={realIndex}
                    onClick={() => goTo(realIndex)}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text)',
                      borderBottom: '1px solid var(--border)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {realIndex + 1}. {s.lines[0] || '(vazio)'}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Preview central */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 20, gap: 16 }}>
          {/* Slide atual (grande) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="muted" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Slide atual: {currentIndex + 1} / {flatSlides.length}</span>
              {projecting && <span style={{ color: 'var(--ok)' }}>● Projetando</span>}
              {blank && <span style={{ color: 'var(--warn)' }}>● Tela preta</span>}
            </div>
            <div
              style={{
                flex: 1,
                background: theme.background,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: blank ? '2px dashed var(--warn)' : '1px solid var(--border)',
                opacity: blank ? 0.3 : 1
              }}
            >
              <div style={{ color: theme.textColor, fontSize: previewFontSize, lineHeight: 1.3, textAlign: 'center' }}>
                {currentSlide?.lines.map((l, i) => <div key={i}>{l}</div>)}
              </div>
              <div style={{ color: theme.footerColor, fontSize: 12, fontStyle: 'italic', position: 'absolute', bottom: 12 }}>
                {currentSlide?.footer}
              </div>
            </div>
          </div>

          {/* Próximo slide (preview menor) */}
          <div style={{ height: 120, display: 'flex', gap: 12 }}>
            <div
              style={{
                width: 200,
                background: theme.background,
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                border: '1px solid var(--border)',
                opacity: 0.6
              }}
            >
              <div className="muted" style={{ fontSize: 10, position: 'absolute', top: 4, left: 8 }}>Próximo</div>
              <div style={{ color: theme.textColor, fontSize: 11, lineHeight: 1.3, textAlign: 'center' }}>
                {nextSlide?.lines.map((l, i) => <div key={i}>{l}</div>) || '— fim —'}
              </div>
            </div>

            {/* Controles de navegação */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0}
                  style={{ fontSize: 16, padding: '8px 16px' }}
                >
                  ← Anterior
                </button>
                <button
                  onClick={goNext}
                  disabled={currentIndex === flatSlides.length - 1}
                  className="primary"
                  style={{ fontSize: 16, padding: '8px 16px' }}
                >
                  Próximo →
                </button>
              </div>
              <div className="muted" style={{ fontSize: 11 }}>
                Atalhos: ← → (navegar) · B (tela preta) · ESC (parar)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
