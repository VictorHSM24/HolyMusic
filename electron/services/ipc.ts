import { ipcMain, dialog, BrowserWindow } from 'electron'
import { listModels } from './ollama.js'
import { generateSlides } from './slides.js'
import { exportPptx } from './pptx.js'

export function registerIpc(): void {
  ipcMain.handle('ollama:list-models', async () => {
    try {
      return await listModels()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(
        `Não foi possível conectar ao Ollama em http://localhost:11434. Verifique se o Ollama está rodando. Detalhe: ${msg}`
      )
    }
  })

  ipcMain.handle('ollama:generate-slides', async (_evt, payload) => {
    return generateSlides(payload)
  })

  ipcMain.handle('pptx:export', async (_evt, payload) => {
    return exportPptx(payload)
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
}
