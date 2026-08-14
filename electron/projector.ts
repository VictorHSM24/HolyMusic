// Gerencia a janela do projetor (fullscreen no segundo monitor).

import { BrowserWindow, screen, ipcMain } from 'electron'
import { join } from 'path'

let projectorWindow: BrowserWindow | null = null
let isBlank = false
let lastUpdate: ProjectionPayload | null = null

type ProjectionPayload = {
  lines: string[]
  footer: string
  background: string
  textColor: string
  footerColor: string
  fontSize: number
  footerFontSize: number
}

export function getDisplays() {
  const primary = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map((display, i) => {
    const isPrimary = display.id === primary.id
    const bounds = display.bounds
    // Identifica posição relativa para label mais intuitiva
    let position = ''
    if (isPrimary) {
      position = 'Primário'
    } else if (bounds.x < 0) {
      position = 'À esquerda'
    } else if (bounds.x > 0) {
      position = bounds.y < 0 ? 'À direita/acima' : 'À direita'
    } else if (bounds.y < 0) {
      position = 'Acima'
    } else {
      position = 'Secundário'
    }
    return {
      id: i,
      label: `Tela ${i + 1} — ${bounds.width}×${bounds.height} (${position})`,
      width: bounds.width,
      height: bounds.height,
      isPrimary
    }
  })
}

export function startProjection(displayId: number): boolean {
  if (projectorWindow) {
    // Já está projetando — apenas move para o display selecionado
    closeProjection()
  }

  const displays = screen.getAllDisplays()
  if (displayId < 0 || displayId >= displays.length) {
    return false
  }

  const targetDisplay = displays[displayId]
  const { x, y, width, height } = targetDisplay.bounds

  projectorWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    fullscreen: true,
    frame: false,
    kiosk: true,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  projectorWindow.on('closed', () => {
    projectorWindow = null
    // Notifica a janela de controle
    BrowserWindow.getAllWindows().forEach((win) => {
      if (win.webContents.getTitle() !== 'HolyMusic Projector') {
        win.webContents.send('projection:closed')
      }
    })
  })

  // Carrega a página do projetor
  if (process.env['ELECTRON_RENDERER_URL']) {
    // Dev mode — carrega do dev server
    projectorWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/projector.html`)
  } else {
    // Produção — carrega do arquivo buildado
    projectorWindow.loadFile(join(__dirname, '../renderer/projector.html'))
  }

  return true
}

export function closeProjection(): boolean {
  if (projectorWindow) {
    projectorWindow.close()
    projectorWindow = null
    return true
  }
  return false
}

export function isProjecting(): boolean {
  return projectorWindow !== null
}

export function updateProjection(payload: ProjectionPayload): void {
  lastUpdate = payload
  if (projectorWindow) {
    projectorWindow.webContents.send('projector:update', {
      ...payload,
      blank: isBlank
    })
  }
}

export function setBlank(blank: boolean): void {
  isBlank = blank
  if (projectorWindow && lastUpdate) {
    projectorWindow.webContents.send('projector:update', {
      ...lastUpdate,
      blank
    })
  }
}

export function getBlankState(): boolean {
  return isBlank
}

// Registra handlers IPC para projeção
export function registerProjectionIpc(): void {
  ipcMain.handle('projection:list-displays', async () => {
    return getDisplays()
  })

  ipcMain.handle('projection:start', async (_evt, displayId: number) => {
    return { ok: startProjection(displayId) }
  })

  ipcMain.handle('projection:stop', async () => {
    return { ok: closeProjection() }
  })

  ipcMain.handle('projection:update', async (_evt, data: ProjectionPayload) => {
    updateProjection(data)
  })

  ipcMain.handle('projection:blank', async (_evt, blank: boolean) => {
    setBlank(blank)
  })

  // Sinal de que o projetor está pronto (recebido da janela do projetor)
  ipcMain.on('projector:ready', () => {
    if (projectorWindow && lastUpdate) {
      projectorWindow.webContents.send('projector:update', {
        ...lastUpdate,
        blank: isBlank
      })
    }
  })
}
