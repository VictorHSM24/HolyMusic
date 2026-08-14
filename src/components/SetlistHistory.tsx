import { useState, useEffect } from 'react'
import type { SavedSetlist } from '../types'

type Props = {
  onClose: () => void
  onLoadSetlist: (setlist: SavedSetlist) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export default function SetlistHistory({ onClose, onLoadSetlist }: Props) {
  const [setlists, setSetlists] = useState<SavedSetlist[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    window.holy.listSetlists().then((s) => {
      setSetlists(s)
      setLoading(false)
    })
  }, [])

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Remover o setlist "${title || 'sem título'}" do histórico?`)) return
    await window.holy.deleteSetlist(id)
    setSetlists(setlists.filter((s) => s.id !== id))
  }

  const handleLoad = (setlist: SavedSetlist) => {
    onLoadSetlist(setlist)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          width: '90%',
          maxWidth: 700,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--panel)'
          }}
        >
          <h3 style={{ margin: 0 }}>Histórico de setlists ({setlists.length})</h3>
          <span style={{ flex: 1 }} />
          <button className="ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ overflow: 'auto', padding: '8px 20px' }}>
          {loading ? (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>Carregando…</div>
          ) : setlists.length === 0 ? (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
              Nenhum setlist salvo ainda. Quando você gerar um setlist, ele aparecerá aqui automaticamente.
            </div>
          ) : (
            setlists.map((s) => {
              const isOpen = expanded === s.id
              const okCount = s.results.filter((r) => !r.error).length
              return (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    marginBottom: 8,
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
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {s.eventTitle || 'Setlist sem título'}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {formatDate(s.createdAt)} · {s.songs.length} músicas · {okCount} com sucesso
                      </div>
                    </div>
                    <span className="muted">{isOpen ? '▼' : '▶'}</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: 14 }}>
                      <ol style={{ margin: '0 0 12px 20px', padding: 0, fontSize: 13 }}>
                        {s.songs.map((song, i) => (
                          <li key={i} style={{ marginBottom: 2 }}>
                            <strong>{song.song}</strong>
                            {song.author && <span className="muted"> — {song.author}</span>}
                            {s.results[i]?.error && (
                              <span style={{ color: 'var(--danger)', fontSize: 11 }}> ✕</span>
                            )}
                          </li>
                        ))}
                      </ol>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="primary"
                          style={{ fontSize: 12, padding: '4px 12px' }}
                          onClick={() => handleLoad(s)}
                        >
                          ↻ Carregar como base
                        </button>
                        <button
                          className="ghost"
                          style={{ fontSize: 12, padding: '4px 12px', color: 'var(--danger)' }}
                          onClick={() => handleDelete(s.id, s.eventTitle)}
                        >
                          ✕ Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
