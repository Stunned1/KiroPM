const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  electron: () => process.versions.electron,
})

contextBridge.exposeInMainWorld('electronAuth', {
  onOAuthCallback: (callback) => ipcRenderer.on('oauth-callback', (_event, url) => callback(url)),
  removeOAuthCallback: () => ipcRenderer.removeAllListeners('oauth-callback'),
})

contextBridge.exposeInMainWorld('electronFS', {
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
})
