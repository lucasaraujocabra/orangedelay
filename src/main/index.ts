import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import path from 'path'
import Store from 'electron-store'
import { RelayManager } from './relay'
import { LicenseManager } from './license'
import { AppConfig, DEFAULT_CONFIG } from '../shared/types'

const store = new Store<AppConfig>({
  defaults: DEFAULT_CONFIG,
  name: 'orangedelay-config'
})

let mainWindow: BrowserWindow | null = null
let relay: RelayManager | null = null
const license = new LicenseManager()

function loadConfig(): AppConfig {
  return {
    streamKey: store.get('streamKey', DEFAULT_CONFIG.streamKey),
    delaySeconds: store.get('delaySeconds', DEFAULT_CONFIG.delaySeconds),
    twitchIngestUrl: store.get('twitchIngestUrl', DEFAULT_CONFIG.twitchIngestUrl),
    rtmpPort: store.get('rtmpPort', DEFAULT_CONFIG.rtmpPort),
    segmentSeconds: store.get('segmentSeconds', DEFAULT_CONFIG.segmentSeconds),
    maxBufferSeconds: store.get('maxBufferSeconds', DEFAULT_CONFIG.maxBufferSeconds),
    setupComplete: store.get('setupComplete', DEFAULT_CONFIG.setupComplete)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 900,
    minHeight: 640,
    show: false,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: 'OrangeDelay',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function wireRelay(): void {
  const bufferDir = path.join(app.getPath('temp'), 'orangedelay-buffer')
  relay = new RelayManager(loadConfig(), bufferDir)

  relay.on('status', (status) => {
    mainWindow?.webContents.send('relay:status', status)
  })
  relay.on('log', (line: string) => {
    // eslint-disable-next-line no-console
    console.log('[relay]', line)
    mainWindow?.webContents.send('relay:log', line)
  })

  relay.start()
}

function registerIpc(): void {
  ipcMain.handle('relay:getStatus', () => relay?.getStatus())
  ipcMain.handle('relay:getConfig', () => relay?.getConfig())

  ipcMain.handle('relay:setStreamKey', (_e, key: string) => {
    store.set('streamKey', key.trim())
    relay?.setStreamKey(key)
  })

  ipcMain.handle('relay:setDelay', (_e, seconds: number) => {
    const applied = relay?.setDelay(seconds) ?? seconds
    store.set('delaySeconds', applied)
    return applied
  })

  ipcMain.handle('relay:start', () => {
    if (!license.isActive()) {
      return { ok: false, error: 'Licença inativa. Ative sua licença ou inicie um teste.' }
    }
    return relay?.startEgress() ?? { ok: false, error: 'not ready' }
  })
  ipcMain.handle('relay:stop', () => relay?.stopEgress())
  ipcMain.handle('relay:test', () => relay?.testConnection() ?? { ok: false, error: 'not ready' })
  ipcMain.handle('relay:toggle', () => relay?.toggle() ?? false)
  ipcMain.handle('relay:completeSetup', () => {
    store.set('setupComplete', true)
    relay?.updateConfig({ setupComplete: true })
  })

  ipcMain.handle('license:get', () => license.status())
  ipcMain.handle('license:set', (_e, key: string) => license.setKey(key))
  ipcMain.handle('license:refresh', () => license.refresh())
  ipcMain.handle('license:checkout', (_e, plan: 'monthly' | 'annual') =>
    shell.openExternal(license.checkoutUrl(plan))
  )
  ipcMain.handle('license:pix', (_e, period: 'month' | 'year') =>
    shell.openExternal(license.pixUrl(period))
  )
}

app.whenReady().then(() => {
  registerIpc()
  createWindow()
  wireRelay()

  globalShortcut.register('Control+Alt+D', () => {
    const live = relay?.toggle()
    mainWindow?.webContents.send('relay:log', `Atalho: delay ${live ? 'LIGADO' : 'DESLIGADO'}`)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  relay?.stop()
})
