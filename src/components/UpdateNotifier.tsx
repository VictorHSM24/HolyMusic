import { useState, useEffect } from 'react'
import type { UpdaterStatus } from '../types'

export default function UpdateNotifier() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null)
  const [version, setVersion] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    window.holy.updater.getVersion().then((v) => setVersion(v.version))
    window.holy.updater.onStatus((_event, data) => {
      setStatus(data)
      // Reset dismissed quando há nova atualização disponível
      if (data.status === 'available' || data.status === 'downloaded') {
        setDismissed(false)
      }
    })
  }, [])

  if (!status || dismissed) {
    // Mostra versão atual discretamente no canto
    return version ? (
      <span className="muted" style={{ fontSize: 11, padding: '0 8px' }}>v{version}</span>
    ) : null
  }

  if (status.status === 'downloading') {
    return (
      <div
        style={{
          padding: '6px 14px',
          background: 'rgba(79,140,255,0.15)',
          borderRadius: 6,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span className="spinner" style={{ width: 12, height: 12 }} />
        <span>Baixando atualização… {status.percent ?? 0}%</span>
      </div>
    )
  }

  if (status.status === 'downloaded') {
    return (
      <div
        style={{
          padding: '6px 14px',
          background: 'rgba(52,199,89,0.15)',
          borderRadius: 6,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span>✓ Atualização v{status.version} pronta. </span>
        <button
          className="primary"
          style={{ fontSize: 11, padding: '2px 10px' }}
          onClick={() => window.holy.updater.install()}
        >
          Reiniciar e instalar
        </button>
        <button
          className="ghost"
          style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => setDismissed(true)}
        >
          Depois
        </button>
      </div>
    )
  }

  if (status.status === 'error') {
    return (
      <span className="muted" style={{ fontSize: 11, padding: '0 8px' }} title={status.message}>
        v{version} (sem atualização)
      </span>
    )
  }

  return version ? (
    <span className="muted" style={{ fontSize: 11, padding: '0 8px' }}>v{version}</span>
  ) : null
}
