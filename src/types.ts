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
  useCache?: boolean
  lyricsHint?: string
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

type HolyApi = {
  listOllamaModels: () => Promise<string[]>
  generateSlides: (p: GenerateSlidesPayload) => Promise<GenerateSlidesResult>
  exportPptx: (p: ExportPptxPayload) => Promise<{ path: string }>
  exportSetlistPptx: (p: SetlistExportPayload) => Promise<{ path: string }>
  showSaveDialog: (defaultName: string) => Promise<{ path: string | null }>
  getCachedSong: (song: string, author: string, language: string) => Promise<CachedSong | null>
  saveCachedSong: (entry: CachedSong) => Promise<{ ok: boolean }>
  listCachedSongs: () => Promise<CachedSong[]>
  deleteCachedSong: (song: string, author: string, language: string) => Promise<{ ok: boolean }>
  saveSetlist: (eventTitle: string, songs: { song: string; author: string; lyricsHint?: string }[], results: SetlistSongEntry[]) => Promise<SavedSetlist>
  listSetlists: () => Promise<SavedSetlist[]>
  deleteSetlist: (id: string) => Promise<{ ok: boolean }>
  projection: {
    listDisplays: () => Promise<DisplayInfo[]>
    start: (displayId: number) => Promise<{ ok: boolean }>
    stop: () => Promise<{ ok: boolean }>
    update: (data: ProjectionUpdate) => Promise<void>
    blank: (blank: boolean) => Promise<void>
    onClosed: (callback: () => void) => () => void
  }
  projector: {
    onUpdate: (callback: (event: unknown, data: ProjectionUpdate & { blank: boolean }) => void) => void
    ready: () => void
  }
  updater: {
    check: () => Promise<{ ok: boolean; error?: string }>
    install: () => Promise<{ ok: boolean }>
    getVersion: () => Promise<{ version: string }>
    onStatus: (callback: (event: unknown, data: UpdaterStatus) => void) => void
  }
}

export type UpdaterStatus = {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  releaseNotes?: string | null
  percent?: number
  transferred?: number
  total?: number
  message?: string
}

declare global {
  interface Window {
    holy: HolyApi
  }
}
