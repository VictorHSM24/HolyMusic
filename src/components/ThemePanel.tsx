import type { SlideTheme } from '../types'

type Props = {
  theme: SlideTheme
  onChange: (t: SlideTheme) => void
}

const PRESETS: { name: string; theme: SlideTheme }[] = [
  {
    name: 'Escuro clássico',
    theme: { background: '#000000', textColor: '#FFFFFF', footerColor: '#9AA0A6', fontSize: 40, footerFontSize: 14, uppercaseLyrics: false, uppercaseFooter: false }
  },
  {
    name: 'Azul culto',
    theme: { background: '#0B1F3A', textColor: '#FFFFFF', footerColor: '#8FB3E0', fontSize: 40, footerFontSize: 14, uppercaseLyrics: false, uppercaseFooter: false }
  },
  {
    name: 'Vinho',
    theme: { background: '#2A0A12', textColor: '#F5E6E8', footerColor: '#C99DA6', fontSize: 40, footerFontSize: 14, uppercaseLyrics: false, uppercaseFooter: false }
  },
  {
    name: 'Claro',
    theme: { background: '#FFFFFF', textColor: '#1A1A1A', footerColor: '#666666', fontSize: 40, footerFontSize: 14, uppercaseLyrics: false, uppercaseFooter: false }
  }
]

export default function ThemePanel({ theme, onChange }: Props) {
  const set = (patch: Partial<SlideTheme>) => onChange({ ...theme, ...patch })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3>Estilo do slide</h3>
      <div className="row">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="ghost"
            onClick={() => onChange({ ...p.theme, uppercaseLyrics: theme.uppercaseLyrics, uppercaseFooter: theme.uppercaseFooter })}
            title={p.name}
            style={{ fontSize: 12, padding: '6px 8px' }}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="theme-row">
        <div className="color-input">
          <input type="color" value={theme.background} onChange={(e) => set({ background: e.target.value })} />
          Fundo
        </div>
        <div className="color-input">
          <input type="color" value={theme.textColor} onChange={(e) => set({ textColor: e.target.value })} />
          Texto
        </div>
        <div className="color-input">
          <input type="color" value={theme.footerColor} onChange={(e) => set({ footerColor: e.target.value })} />
          Rodapé
        </div>
      </div>

      <div className="theme-row">
        <div className="color-input">
          Fonte
          <input
            type="number"
            min={20}
            max={80}
            value={theme.fontSize}
            onChange={(e) => {
              const v = e.target.value
              set({ fontSize: v === '' ? 0 : Number(v) })
            }}
            onFocus={(e) => e.target.select()}
          />
          pt
        </div>
        <div className="color-input">
          Rodapé
          <input
            type="number"
            min={8}
            max={30}
            value={theme.footerFontSize}
            onChange={(e) => {
              const v = e.target.value
              set({ footerFontSize: v === '' ? 0 : Number(v) })
            }}
            onFocus={(e) => e.target.select()}
          />
          pt
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={theme.uppercaseLyrics}
            onChange={(e) => set({ uppercaseLyrics: e.target.checked })}
            style={{ width: 'auto' }}
          />
          Letra em CAIXA ALTA
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={theme.uppercaseFooter}
            onChange={(e) => set({ uppercaseFooter: e.target.checked })}
            style={{ width: 'auto' }}
          />
          Rodapé em CAIXA ALTA
        </label>
      </div>

      <p className="muted">
        Dica: 40pt no PPTX ≈ 53px em 1080p. Ajuste conforme a legibilidade.
      </p>
    </div>
  )
}
