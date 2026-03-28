const { contextBridge } = require('electron')

// Expose safe APIs to renderer here as the app grows
// e.g. contextBridge.exposeInMainWorld('api', { ... })
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  electron: () => process.versions.electron,
})
