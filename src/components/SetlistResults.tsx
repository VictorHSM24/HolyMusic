import { useState } from 'react'
import type { GenerateSlidesResult, SlideTheme, Slide } from '../types'
import SetlistSongEditor from './SetlistSongEditor'

type SongResult = {
  result: GenerateSlidesResult
  error?: string
}

type Props = {
  results: SongResult[]
  theme: SlideTheme
  onEdit: (index: number, slides: Slide[]) => void
}

export default function SetlistResults({ results, theme, onEdit }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)

  const footerFor = (r: GenerateSlidesResult) => {
    const raw = `${r.song} — ${r.author}`
    return theme.uppercaseFooter ? raw.toUpperCase() : raw
  }

  const openEditor = (i: number) => {
    const r = results[i]
    if (!r || r.error) return
    setEditing(i)
    setExpanded(null)
  }

  const saveEdit = (slides: Slide[]) => {
    if (editing !== null) {
      onEdit(editing, slides)
    }
    setEditing(null)
  }

  // Se está editando uma música, mostra o editor em tela cheia
  if (editing !== null && results[editing] && !results[editing].error) {
    return (
      <SetlistSongEditor
        result={results[editing].result}
        theme={theme}
        onSave={saveEdit}
        onClose={() => setEditing(null)}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {results.map((sr, i) => {
        const isOpen = expanded === i
        if (sr.error) {
          return (
            <div key={i} className="banner error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✕</span>
              <span>
                <strong>{sr.error.split(':')[0]}</strong> — {sr.error.split(':').slice(1).join(':').trim()}
              </span>
            </div>
          )
        }
        const r = sr.result
        const sourceLabel = r.fromCache
          ? 'cache local'
          : r.lyricsSource === 'letras.mus.br'
            ? 'letras.mus.br'
            : r.lyricsSource === 'manual'
              ? 'manual'
              : 'IA (revisar)'
        return (
          <div
            key={i}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'var(--panel)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                background: 'var(--panel-2)',
                borderBottom: isOpen ? '1px solid var(--border)' : 'none'
              }}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {i + 1}. {r.song}
              </span>
              <span className="muted">— {r.author}</span>
              <span style={{ flex: 1 }} />
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: r.fromCache ? 'rgba(52,199,89,0.15)' : 'rgba(79,140,255,0.12)',
                  color: r.fromCache ? '#8fffa8' : '#aac8ff'
                }}
              >
                {sourceLabel} · {r.slides.length} slides
              </span>
              <span className="muted">{isOpen ? '▼' : '▶'}</span>
            </div>

            {isOpen && (
              <div style={{ padding: 14 }}>
                {r.warning && (
                  <div className="banner warn" style={{ marginBottom: 10, fontSize: 12 }}>
                    {r.warning}
                  </div>
                )}

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 8
                  }}
                >
                  {r.slides.map((s, si) => {
                    const previewFontSize = Math.max(7, Math.min(12, theme.fontSize * 0.28))
                    const displayLines = theme.uppercaseLyrics
                      ? s.lines.map((l) => l.toUpperCase())
                      : s.lines
                    return (
                      <div
                        key={si}
                        style={{
                          aspectRatio: '16/9',
                          background: theme.background,
                          borderRadius: 6,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8,
                          position: 'relative',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ color: theme.textColor, fontSize: previewFontSize, lineHeight: 1.3 }}>
                          {displayLines.map((l, li) => (
                            <div key={li}>{l}</div>
                          ))}
                        </div>
                        <div
                          style={{
                            color: theme.footerColor,
                            fontSize: 7,
                            fontStyle: 'italic',
                            position: 'absolute',
                            bottom: 4
                          }}
                        >
                          {footerFor(r)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => openEditor(i)} style={{ fontSize: 12, padding: '4px 10px' }}>
                    ✏ Editar slides (editor completo)
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
