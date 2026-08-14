import { useState, useRef } from 'react'
import SlideCard from './SlideCard'
import type { Slide, SlideTheme, GenerateSlidesResult } from '../types'

type Props = {
  result: GenerateSlidesResult
  theme: SlideTheme
  onSave: (slides: Slide[]) => void
  onClose: () => void
}

export default function SetlistSongEditor({ result, theme, onSave, onClose }: Props) {
  const [slides, setSlides] = useState<Slide[]>(result.slides)
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const footerRaw = `${result.song} — ${result.author}`
  const footer = theme.uppercaseFooter ? footerRaw.toUpperCase() : footerRaw

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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000
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
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{result.song}</div>
          <div className="muted" style={{ fontSize: 13 }}>{result.author}</div>
        </div>
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 12 }}>{slides.length} slides</span>
        <button className="ghost" onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={() => onSave(slides)}>Salvar alterações</button>
      </div>

      {/* Body */}
      <div style={{ overflow: 'auto', padding: 20, flex: 1 }}>
        {result.warning && (
          <div className="banner warn" style={{ marginBottom: 16 }}>
            {result.warning}
          </div>
        )}

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
      </div>
    </div>
  )
}
