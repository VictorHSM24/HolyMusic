import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpc } from './services/ipc.js'
import { registerProjectionIpc } from './projector.js'
import { setupAutoUpdater } from './updater.js'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'HolyMusic',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Configura auto-updater (só funciona em produção)
  setupAutoUpdater(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerIpc()
  registerProjectionIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
