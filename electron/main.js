const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const { execFile } = require('child_process')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const isDev = process.env.NODE_ENV !== 'production'
const PROTOCOL = 'aipm'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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

// ── CSV file loading ──────────────────────────────────────────────────────────
function loadCSVContext(projectPath) {
  let csvContext = ''
  const csvFiles = ['reviews.csv', 'synthetic_data.csv']
  for (const csvFile of csvFiles) {
    const candidates = [
      projectPath ? path.join(projectPath, csvFile) : null,
      path.join(__dirname, '..', csvFile),
    ].filter(Boolean)
    for (const filePath of candidates) {
      try {
        if (fs.existsSync(filePath)) {
          csvContext += `\n\n--- ${csvFile} ---\n${fs.readFileSync(filePath, 'utf8').slice(0, 6000)}`
          break
        }
      } catch {}
    }
  }
  return csvContext
}

// ── OpenAI API helper ─────────────────────────────────────────────────────────
async function callOpenAI({ messages, stream = false, tools = null, temperature = 0.7 }) {
  const body = { model: 'gpt-4o-mini', messages, temperature }
  if (tools) body.tools = tools
  if (stream) body.stream = true

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }
  return stream ? response : response.json()
}

// ── Stream OpenAI response and emit chunks ────────────────────────────────────
async function streamOpenAI(event, messages, channelName = 'proposal-chunk') {
  const response = await callOpenAI({ messages, stream: true })
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]' || !trimmed.startsWith('data: ')) continue
      try {
        const content = JSON.parse(trimmed.slice(6)).choices?.[0]?.delta?.content || ''
        if (content) { fullText += content; event.sender.send(channelName, content) }
      } catch {}
    }
  }
  return fullText
}

app.whenReady().then(() => {
  createWindow()

  ipcMain.handle('open-folder-dialog', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
    return canceled ? null : filePaths[0]
  })

  ipcMain.handle('git-clone', async (_event, { url, destDir }) => {
    return new Promise((resolve, reject) => {
      execFile('git', ['clone', url], { cwd: destDir }, (err, _stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message))
        else resolve()
      })
    })
  })

  ipcMain.handle('read-directory', async (_event, dirPath) => {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .map(e => ({ name: e.name, isDirectory: e.isDirectory(), path: path.join(dirPath, e.name) }))
      .sort((a, b) => { if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1; return a.name.localeCompare(b.name) })
  })

  ipcMain.handle('read-file', async (_event, filePath) => fs.readFileSync(filePath, 'utf8'))

  ipcMain.handle('write-file', async (_event, { filePath, content }) => fs.writeFileSync(filePath, content, 'utf8'))

  // ── File upload for AI context ──────────────────────────────────────────────
  ipcMain.handle('read-upload', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Context files', extensions: ['txt', 'md', 'csv', 'json', 'png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    })
    if (canceled) return []
    return filePaths.map(fp => {
      try {
        const ext = path.extname(fp).toLowerCase().slice(1)
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
          const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
          return { name: path.basename(fp), content: '', imageData: fs.readFileSync(fp).toString('base64'), mimeType: mime }
        }
        return { name: path.basename(fp), content: fs.readFileSync(fp, 'utf8') }
      } catch {
        return { name: path.basename(fp), content: '[Could not read file]' }
      }
    })
  })

  // ── Agentic chat ────────────────────────────────────────────────────────────
  ipcMain.handle('chat-message', async (event, { message, history, projectPath, uploadedFiles }) => {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in .env.local')

    const csvContext = loadCSVContext(projectPath)
    let fileContext = ''
    const imageFiles = []

    if (uploadedFiles?.length) {
      const textFiles = uploadedFiles.filter(f => !f.imageData)
      imageFiles.push(...uploadedFiles.filter(f => f.imageData))
      if (textFiles.length) {
        fileContext = '\n\n## UPLOADED CONTEXT FILES\n'
        fileContext += textFiles.map(f => `\n--- ${f.name} ---\n${(f.content || '').slice(0, 6000)}`).join('')
      }
    }

    const tools = [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the contents of a file in the project',
          parameters: { type: 'object', properties: { file_path: { type: 'string' } }, required: ['file_path'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_directory',
          description: 'List files and folders in a directory',
          parameters: { type: 'object', properties: { dir_path: { type: 'string' } }, required: ['dir_path'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_files',
          description: 'Search for a text pattern across all project files',
          parameters: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_proposal',
          description: 'Update or extend the proposal canvas shown to the user.',
          parameters: { type: 'object', properties: { patch: { type: 'object' } }, required: ['patch'] },
        },
      },
    ]

    async function executeTool(name, args) {
      try {
        if (name === 'read_file') {
          const fp = path.isAbsolute(args.file_path) ? args.file_path : path.join(projectPath || '', args.file_path)
          return fs.readFileSync(fp, 'utf8').slice(0, 6000)
        }
        if (name === 'list_directory') {
          const dp = path.isAbsolute(args.dir_path) ? args.dir_path : path.join(projectPath || '', args.dir_path)
          return fs.readdirSync(dp, { withFileTypes: true })
            .filter(e => !['node_modules', '.git', 'dist'].includes(e.name))
            .map(e => `${e.isDirectory() ? '[dir]' : '[file]'} ${e.name}`).join('\n')
        }
        if (name === 'search_files') {
          const results = []
          function searchDir(dir) {
            if (!fs.existsSync(dir)) return
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
              if (['node_modules', '.git', 'dist'].includes(e.name)) continue
              const fp = path.join(dir, e.name)
              if (e.isDirectory()) searchDir(fp)
              else {
                try {
                  if (fs.readFileSync(fp, 'utf8').toLowerCase().includes(args.pattern.toLowerCase()))
                    results.push(fp.replace((projectPath || '') + '/', ''))
                } catch {}
              }
            }
          }
          searchDir(projectPath || '')
          return results.slice(0, 20).join('\n') || 'No matches found'
        }
        if (name === 'update_proposal') {
          event.sender.send('proposal-patch', args.patch)
          return 'Proposal updated successfully'
        }
      } catch (err) {
        return `Error: ${err.message}`
      }
    }

    const systemMessage = {
      role: 'system',
      content: `You are Mira, an AI PM assistant. Use tools to read project files when needed. Be concise. Project root: ${projectPath || 'unknown'}\n\nProduct data:\n${csvContext || 'No CSV data loaded'}${fileContext ? `\n\nUploaded context files:\n${fileContext}` : ''}`,
    }

    const messages = [systemMessage]
    for (const m of (history || []).slice(-10)) {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })
    }
    messages.push(imageFiles.length
      ? { role: 'user', content: [{ type: 'text', text: message }, ...imageFiles.map(f => ({ type: 'image_url', image_url: { url: `data:${f.mimeType};base64,${f.imageData}` } }))] }
      : { role: 'user', content: message }
    )

    let iterations = 0
    let fullText = ''

    while (iterations++ < 10) {
      const response = await callOpenAI({ messages, tools })
      const choice = response.choices?.[0]
      if (!choice) break
      const assistantMsg = choice.message

      if (choice.finish_reason === 'tool_calls' || assistantMsg?.tool_calls?.length) {
        messages.push(assistantMsg)
        for (const toolCall of assistantMsg.tool_calls) {
          let fnArgs = {}
          try { fnArgs = JSON.parse(toolCall.function.arguments) } catch {}
          event.sender.send('chat-tool-call', { name: toolCall.function.name, args: fnArgs })
          const result = await executeTool(toolCall.function.name, fnArgs)
          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: typeof result === 'string' ? result : JSON.stringify(result) })
        }
      } else {
        fullText = assistantMsg?.content || ''
        const words = fullText.split(' ')
        for (let i = 0; i < words.length; i += 3) {
          event.sender.send('chat-chunk', words.slice(i, i + 3).join(' ') + ' ')
          await new Promise(r => setTimeout(r, 15))
        }
        break
      }
    }
    return fullText
  })

  // ── Generate proposal ───────────────────────────────────────────────────────
  ipcMain.handle('generate-proposal', async (event, { prompt, files, projectPath }) => {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in .env.local')

    const csvContext = loadCSVContext(projectPath)
    let fileContext = ''
    const imageFiles = []

    if (files?.length) {
      const textFiles = files.filter(f => !f.imageData)
      imageFiles.push(...files.filter(f => f.imageData))
      if (textFiles.length) {
        fileContext = '\n\n## UPLOADED CONTEXT FILES\n'
        fileContext += textFiles.map(f => `\n--- ${f.name} ---\n${(f.content || '').slice(0, 8000)}`).join('')
      }
    }

    let codeContext = ''
    if (projectPath) {
      try {
        const srcPath = path.join(projectPath, 'src')
        if (fs.existsSync(srcPath)) {
          codeContext = fs.readdirSync(srcPath)
            .filter(f => /\.(jsx?|tsx?)$/.test(f)).slice(0, 3)
            .map(f => `\n\n--- ${f} ---\n${fs.readFileSync(path.join(srcPath, f), 'utf8').slice(0, 1000)}`).join('')
        }
      } catch {}
    }

    const userContent = fileContext
      ? `Request: ${prompt}\n\nIMPORTANT: Use these uploaded files to inform the proposal:\n${fileContext}${codeContext}`
      : `Request: ${prompt}${codeContext}`

    const messages = [
      {
        role: 'system',
        content: `You are Mira, an AI PM assistant. Generate a structured product proposal based on the context provided.\n\nProduct data:\n${csvContext || 'No CSV data available'}\n\nRespond with ONLY valid JSON:\n{"title":"...","why":"...","signals":[{"source":"...","quote":"..."}],"ui":[{"file":"...","change":"..."}],"schema":[{"sql":"..."}],"tasks":[{"id":1,"label":"..."}]}`,
      },
      {
        role: 'user',
        content: imageFiles.length
          ? [{ type: 'text', text: userContent }, ...imageFiles.map(f => ({ type: 'image_url', image_url: { url: `data:${f.mimeType};base64,${f.imageData}` } }))]
          : userContent,
      },
    ]

    const fullText = await streamOpenAI(event, messages, 'proposal-chunk')
    event.sender.send('proposal-done', fullText)
    return fullText
  })
})

app.on('open-url', (event, url) => { event.preventDefault(); handleOAuthCallback(url) })

app.on('second-instance', (_event, argv) => {
  const url = argv.find(arg => arg.startsWith(`${PROTOCOL}://`))
  if (url) handleOAuthCallback(url)
  if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() }
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
