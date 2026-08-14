// Auto-updater via GitHub Releases.
// Verifica atualizações no startup e notifica a UI.

import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setupAutoUpdater(win: BrowserWindow): void {
  mainWindow = win

  // Não verificar em desenvolvimento
  if (!app.isPackaged) {
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    sendStatus('checking')
  })

  autoUpdater.on('update-available', (info) => {
    sendStatus('available', { version: info.version, releaseNotes: info.releaseNotes })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus('not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    sendStatus('downloading', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    sendStatus('error', { message: err?.message ?? String(err) })
  })

  // Handlers IPC para a UI interagir com o updater
  ipcMain.handle('updater:check', async () => {
    try {
      await autoUpdater.checkForUpdates()
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('updater:install', async () => {
    autoUpdater.quitAndInstall()
    return { ok: true }
  })

  ipcMain.handle('updater:version', async () => {
    return { version: app.getVersion() }
  })

  // Verifica atualizações 3 segundos após abrir
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silencioso — não incomoda o usuário se falhar
    })
  }, 3000)
}

function sendStatus(status: string, data?: Record<string, unknown>): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, ...data })
  }
}

// Importação tardia para evitar problemas de tree-shaking
import { app } from 'electron'
