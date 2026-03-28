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
  gitClone: (args) => ipcRenderer.invoke('git-clone', args),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (args) => ipcRenderer.invoke('write-file', args),
  readUpload: () => ipcRenderer.invoke('read-upload'),
})

contextBridge.exposeInMainWorld('electronAI', {
  generateProposal: (args) => ipcRenderer.invoke('generate-proposal', args),
  onChunk: (cb) => ipcRenderer.on('proposal-chunk', (_e, chunk) => cb(chunk)),
  onDone: (cb) => ipcRenderer.once('proposal-done', (_e, full) => cb(full)),
  removeListeners: () => {
    ipcRenderer.removeAllListeners('proposal-chunk')
    ipcRenderer.removeAllListeners('proposal-done')
  },
  sendChat: (args) => ipcRenderer.invoke('chat-message', args),
  onChatChunk: (cb) => ipcRenderer.on('chat-chunk', (_e, chunk) => cb(chunk)),
  onChatToolCall: (cb) => ipcRenderer.on('chat-tool-call', (_e, tool) => cb(tool)),
  onProposalPatch: (cb) => ipcRenderer.on('proposal-patch', (_e, patch) => cb(patch)),
  removeChatListeners: () => {
    ipcRenderer.removeAllListeners('chat-chunk')
    ipcRenderer.removeAllListeners('chat-tool-call')
    ipcRenderer.removeAllListeners('proposal-patch')
  },
})
