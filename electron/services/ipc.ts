import { ipcMain, dialog, BrowserWindow } from 'electron'
import { listModels } from './ollama.js'
import { generateSlides } from './slides.js'
import { exportPptx, exportSetlistPptx } from './pptx.js'
import {
  getCachedSong,
  saveCachedSong,
  listCachedSongs,
  deleteCachedSong,
  exportAllSongs,
  importSongs
} from './db.js'
import type { CachedSong } from './db.js'
import { saveSetlist, listSetlists, deleteSetlist } from './setlistDb.js'
import type { SetlistSongEntry } from './setlistDb.js'

export function registerIpc(): void {
  ipcMain.handle('ollama:list-models', async () => {
    try {
      return await listModels()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Não foi possível conectar ao Ollama em http://127.0.0.1:11434. Verifique se o Ollama está rodando. Detalhe: ${msg}`
      )
    }
  })

  ipcMain.handle('ollama:generate-slides', async (_evt, payload) => {
    return generateSlides(payload)
  })

  ipcMain.handle('pptx:export', async (_evt, payload) => {
    return exportPptx(payload)
  })

  ipcMain.handle('pptx:export-setlist', async (_evt, payload) => {
    return exportSetlistPptx(payload)
  })

  ipcMain.handle('dialog:save', async (_evt, defaultName: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showSaveDialog(win!, {
      title: 'Salvar slides PPTX',
      defaultPath: defaultName.endsWith('.pptx') ? defaultName : `${defaultName}.pptx`,
      filters: [{ name: 'PowerPoint', extensions: ['pptx'] }]
    })
    return { path: result.canceled ? null : result.filePath || null }
  })

  // Banco local
  ipcMain.handle('db:get', async (_evt, args: { song: string; author: string; language: string }) => {
    return getCachedSong(args.song, args.author, args.language)
  })

  ipcMain.handle('db:save', async (_evt, entry: CachedSong) => {
    saveCachedSong(entry)
    return { ok: true }
  })

  ipcMain.handle('db:list', async () => {
    return listCachedSongs()
  })

  ipcMain.handle('db:delete', async (_evt, args: { song: string; author: string; language: string }) => {
    deleteCachedSong(args.song, args.author, args.language)
    return { ok: true }
  })

  ipcMain.handle('db:export', async () => {
    return exportAllSongs()
  })

  ipcMain.handle('db:import', async (_evt, args: { songs: CachedSong[]; overwrite: boolean }) => {
    return importSongs(args.songs, args.overwrite)
  })

  // Histórico de setlists
  ipcMain.handle('setlist:save', async (_evt, args: {
    eventTitle: string
    songs: { song: string; author: string; lyricsHint?: string }[]
    results: SetlistSongEntry[]
  }) => {
    return saveSetlist(args.eventTitle, args.songs, args.results)
  })

  ipcMain.handle('setlist:list', async () => {
    return listSetlists()
  })

  ipcMain.handle('setlist:delete', async (_evt, id: string) => {
    deleteSetlist(id)
    return { ok: true }
  })
}
