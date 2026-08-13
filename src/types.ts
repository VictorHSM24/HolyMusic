// Tipos espelhados do preload (o renderer não importa do preload diretamente)
export type Slide = { lines: string[] }

export type SlideTheme = {
  background: string
  textColor: string
  footerColor: string
  fontSize: number
  footerFontSize: number
  uppercaseLyrics: boolean
  uppercaseFooter: boolean
}

export type GenerateSlidesPayload = {
  song: string
  author: string
  language: string
  model: string
  tryWeb: boolean
  manualLyrics?: string
}

export type GenerateSlidesResult = {
  slides: Slide[]
  lyricsSource: 'letras.mus.br' | 'llm' | 'manual'
  lyricsRaw: string
  song: string
  author: string
  warning?: string
}

export type ExportPptxPayload = {
  slides: Slide[]
  song: string
  author: string
  theme: SlideTheme
  outputPath: string
}

type HolyApi = {
  listOllamaModels: () => Promise<string[]>
  generateSlides: (p: GenerateSlidesPayload) => Promise<GenerateSlidesResult>
  exportPptx: (p: ExportPptxPayload) => Promise<{ path: string }>
  showSaveDialog: (defaultName: string) => Promise<{ path: string | null }>
}

declare global {
  interface Window {
    holy: HolyApi
  }
}
