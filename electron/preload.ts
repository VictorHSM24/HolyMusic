import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Ollama
  listOllamaModels: (): Promise<string[]> => ipcRenderer.invoke('ollama:list-models'),
  generateSlides: (
    payload: GenerateSlidesPayload
  ): Promise<GenerateSlidesResult> => ipcRenderer.invoke('ollama:generate-slides', payload),

  // PPTX
  exportPptx: (payload: ExportPptxPayload): Promise<{ path: string }> =>
    ipcRenderer.invoke('pptx:export', payload),
  showSaveDialog: (defaultName: string): Promise<{ path: string | null }> =>
    ipcRenderer.invoke('dialog:save', defaultName)
}

export type GenerateSlidesPayload = {
  song: string
  author: string
  language: string
  model: string
  tryWeb: boolean
  manualLyrics?: string
}

export type Slide = {
  lines: string[]
}

export type GenerateSlidesResult = {
  slides: Slide[]
  lyricsSource: 'letras.mus.br' | 'llm' | 'manual'
  lyricsRaw: string
  song: string
  author: string
  warning?: string
}

export type SlideTheme = {
  background: string
  textColor: string
  footerColor: string
  fontSize: number
  footerFontSize: number
  uppercaseLyrics: boolean
  uppercaseFooter: boolean
}

export type ExportPptxPayload = {
  slides: Slide[]
  song: string
  author: string
  theme: SlideTheme
  outputPath: string
}

contextBridge.exposeInMainWorld('holy', api)
