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
  exportSetlistPptx: (payload: SetlistExportPayload): Promise<{ path: string }> =>
    ipcRenderer.invoke('pptx:export-setlist', payload),
  showSaveDialog: (defaultName: string): Promise<{ path: string | null }> =>
    ipcRenderer.invoke('dialog:save', defaultName),

  // Banco local
  getCachedSong: (song: string, author: string, language: string): Promise<CachedSong | null> =>
    ipcRenderer.invoke('db:get', { song, author, language }),
  saveCachedSong: (entry: CachedSong): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('db:save', entry),
  listCachedSongs: (): Promise<CachedSong[]> => ipcRenderer.invoke('db:list'),
  deleteCachedSong: (song: string, author: string, language: string): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('db:delete', { song, author, language }),

  // Histórico de setlists
  saveSetlist: (eventTitle: string, songs: { song: string; author: string; lyricsHint?: string }[], results: SetlistSongEntry[]): Promise<SavedSetlist> =>
    ipcRenderer.invoke('setlist:save', { eventTitle, songs, results }),
  listSetlists: (): Promise<SavedSetlist[]> => ipcRenderer.invoke('setlist:list'),
  deleteSetlist: (id: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('setlist:delete', id),

  // Projeção ao vivo
  projection: {
    listDisplays: (): Promise<DisplayInfo[]> => ipcRenderer.invoke('projection:list-displays'),
    start: (displayId: number): Promise<{ ok: boolean }> => ipcRenderer.invoke('projection:start', displayId),
    stop: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('projection:stop'),
    update: (data: ProjectionUpdate): Promise<void> => ipcRenderer.invoke('projection:update', data),
    blank: (blank: boolean): Promise<void> => ipcRenderer.invoke('projection:blank', blank),
    onClosed: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('projection:closed', handler)
      return () => ipcRenderer.removeListener('projection:closed', handler)
    }
  },

  // Projector renderer (usado apenas na janela do projetor)
  projector: {
    onUpdate: (callback: (event: unknown, data: ProjectorData) => void) => {
      ipcRenderer.on('projector:update', callback as never)
    },
    ready: () => ipcRenderer.send('projector:ready')
  }
}

export type GenerateSlidesPayload = {
  song: string
  author: string
  language: string
  model: string
  tryWeb: boolean
  manualLyrics?: string
  useCache?: boolean
  lyricsHint?: string
}

export type Slide = {
  lines: string[]
}

export type GenerateSlidesResult = {
  slides: Slide[]
  lyricsSource: 'letras.mus.br' | 'llm' | 'manual' | 'cache'
  lyricsRaw: string
  song: string
  author: string
  warning?: string
  fromCache: boolean
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

export type SetlistEntry = {
  song: string
  author: string
  slides: Slide[]
}

export type SetlistExportPayload = {
  entries: SetlistEntry[]
  theme: SlideTheme
  outputPath: string
  eventTitle?: string
}

export type CachedSong = {
  song: string
  author: string
  language: string
  lyrics: string
  slides: Slide[]
  source: 'letras.mus.br' | 'llm' | 'manual'
  approved: boolean
  updatedAt: string
}

export type SetlistSongEntry = {
  song: string
  author: string
  slides: Slide[]
  source: string
  error?: string
}

export type SavedSetlist = {
  id: string
  eventTitle: string
  songs: { song: string; author: string; lyricsHint?: string }[]
  results: SetlistSongEntry[]
  createdAt: string
}

export type DisplayInfo = {
  id: number
  label: string
  width: number
  height: number
  isPrimary: boolean
}

export type ProjectionUpdate = {
  lines: string[]
  footer: string
  background: string
  textColor: string
  footerColor: string
  fontSize: number
  footerFontSize: number
}

export type ProjectorData = ProjectionUpdate & {
  blank: boolean
}

contextBridge.exposeInMainWorld('holy', api)
