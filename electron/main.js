const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const path = require('path')
const { execFile } = require('child_process')
const fs = require('fs')

const isDev = process.env.NODE_ENV !== 'production'
const PROTOCOL = 'aipm'

// Register custom protocol for OAuth redirect
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

function handleOAuthCallback(url) {
  if (mainWindow && url.startsWith(`${PROTOCOL}://`)) {
    mainWindow.webContents.send('oauth-callback', url)
    mainWindow.focus()
  }
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('open-folder-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('git-clone', async (_event, { url, destDir }) => {
    return new Promise((resolve, reject) => {
      execFile('git', ['clone', url], { cwd: destDir }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message))
        else resolve()
      })
    })
  })

  ipcMain.handle('read-directory', async (_event, dirPath) => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      path: path.join(dirPath, e.name),
    })).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  })
})

// macOS: handle protocol via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault()
  handleOAuthCallback(url)
})

// Windows/Linux: handle protocol via second-instance
app.on('second-instance', (_event, argv) => {
  const url = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
  if (url) handleOAuthCallback(url)
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
