import { useState, useEffect } from 'react'
import type { CachedSong } from '../types'

type Props = {
  onClose: () => void
  onUseSong: (song: CachedSong) => void
}

export default function DatabasePanel({ onClose, onUseSong }: Props) {
  const [songs, setSongs] = useState<CachedSong[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.holy.listCachedSongs().then((s) => {
      setSongs(s)
      setLoading(false)
    })
  }, [])

  const filtered = songs.filter((s) => {
    const q = filter.toLowerCase()
    return (
      s.song.toLowerCase().includes(q) ||
      s.author.toLowerCase().includes(q)
    )
  })

  const handleDelete = async (song: CachedSong) => {
    if (!confirm(`Remover "${song.song} — ${song.author}" do banco?`)) return
    await window.holy.deleteCachedSong(song.song, song.author, song.language)
    setSongs(songs.filter((s) => !(s.song === song.song && s.author === song.author && s.language === song.language)))
  }

  const handleToggleApproved = async (song: CachedSong) => {
    const updated = { ...song, approved: !song.approved }
    await window.holy.saveCachedSong(updated)
    setSongs(songs.map((s) => (s.song === song.song && s.author === song.author && s.language === song.language ? updated : s)))
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
          maxWidth: 800,
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
          <h3 style={{ margin: 0 }}>Banco de músicas ({songs.length})</h3>
          <span style={{ flex: 1 }} />
          <input
            placeholder="Buscar…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 200 }}
          />
          <button className="ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ overflow: 'auto', padding: '8px 20px' }}>
          {loading ? (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
              {songs.length === 0
                ? 'Nenhuma música salva ainda. Gere slides para começar a popular o banco.'
                : 'Nenhuma música encontrada com esse filtro.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 4px' }}>Música</th>
                  <th style={{ padding: '8px 4px' }}>Autor</th>
                  <th style={{ padding: '8px 4px' }}>Fonte</th>
                  <th style={{ padding: '8px 4px' }}>Slides</th>
                  <th style={{ padding: '8px 4px' }}>Status</th>
                  <th style={{ padding: '8px 4px', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 600 }}>{s.song}</td>
                    <td style={{ padding: '8px 4px' }}>{s.author}</td>
                    <td style={{ padding: '8px 4px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background:
                            s.source === 'letras.mus.br'
                              ? 'rgba(52,199,89,0.15)'
                              : s.source === 'manual'
                                ? 'rgba(162,162,162,0.15)'
                                : 'rgba(255,159,10,0.15)',
                          color:
                            s.source === 'letras.mus.br'
                              ? '#8fffa8'
                              : s.source === 'manual'
                                ? '#ccc'
                                : '#ffcc66'
                        }}
                      >
                        {s.source}
                      </span>
                    </td>
                    <td style={{ padding: '8px 4px' }}>{s.slides.length}</td>
                    <td style={{ padding: '8px 4px' }}>
                      {s.approved ? (
                        <span style={{ color: 'var(--ok)' }}>✓ aprovada</span>
                      ) : (
                        <span style={{ color: 'var(--warn)' }}>⚠ não revisada</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        style={{ fontSize: 11, padding: '2px 8px', marginRight: 4 }}
                        onClick={() => onUseSong(s)}
                      >
                        Abrir
                      </button>
                      <button
                        className="ghost"
                        style={{ fontSize: 11, padding: '2px 8px', marginRight: 4 }}
                        onClick={() => handleToggleApproved(s)}
                      >
                        {s.approved ? 'Rejeitar' : 'Aprovar'}
                      </button>
                      <button
                        className="ghost"
                        style={{ fontSize: 11, padding: '2px 8px', color: 'var(--danger)' }}
                        onClick={() => handleDelete(s)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
