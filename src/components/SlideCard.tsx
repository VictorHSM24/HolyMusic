import { useState } from 'react'
import type { Slide, SlideTheme } from '../types'

type Props = {
  index: number
  total: number
  slide: Slide
  theme: SlideTheme
  footer: string
  onChange: (s: Slide) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onSplit: () => void
  onMergePrev: () => void
}

export default function SlideCard({
  index,
  total,
  slide,
  theme,
  footer,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSplit,
  onMergePrev
}: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(slide.lines.join('\n'))

  const save = () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    onChange({ lines })
    setEditing(false)
  }

  const previewFontSize = Math.max(8, Math.min(16, theme.fontSize * 0.32))
  const displayLines = theme.uppercaseLyrics
    ? slide.lines.map((l) => l.toUpperCase())
    : slide.lines

  return (
    <div className="slide-card">
      <div className="preview" style={{ background: theme.background }}>
        {editing ? (
          <div className="slide-edit" style={{ width: '100%' }}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ background: 'var(--panel-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
            />
          </div>
        ) : (
          <>
            <div className="lines" style={{ color: theme.textColor, fontSize: previewFontSize }}>
              {displayLines.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
            <div className="footer" style={{ color: theme.footerColor }}>
              {footer}
            </div>
          </>
        )}
      </div>
      <div className="toolbar">
        <span className="idx" title="Arraste para reordenar">⠿ #{index + 1}</span>
        {editing ? (
          <>
            <button onClick={save}>OK</button>
            <button className="ghost" onClick={() => setEditing(false)}>Cancelar</button>
          </>
        ) : (
          <>
            <button onClick={() => { setText(slide.lines.join('\n')); setEditing(true) }}>Editar</button>
            <button className="ghost" onClick={onSplit} disabled={slide.lines.length < 2} title="Dividir este slide ao meio">⤳ Dividir</button>
            <button className="ghost" onClick={onMergePrev} disabled={index === 0} title="Juntar com o slide anterior">⇠ Juntar</button>
            <button className="ghost" onClick={onMoveUp} disabled={index === 0}>↑</button>
            <button className="ghost" onClick={onMoveDown} disabled={index === total - 1}>↓</button>
            <button className="danger ghost" onClick={onDelete}>✕</button>
          </>
        )}
      </div>
    </div>
  )
}
