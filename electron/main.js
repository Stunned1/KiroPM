const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const path = require('path')
const { execFile } = require('child_process')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })
const { GoogleGenerativeAI } = require('@google/generative-ai')

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

  ipcMain.handle('read-file', async (_event, filePath) => {
    return fs.readFileSync(filePath, 'utf8')
  })

  ipcMain.handle('write-file', async (_event, { filePath, content }) => {
    fs.writeFileSync(filePath, content, 'utf8')
  })

  // ── File upload for AI context ──────────────────────────────────────────────
  ipcMain.handle('read-upload', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Context files', extensions: ['txt', 'md', 'csv', 'json', 'pdf'] },
      ],
    })
    if (canceled) return []
    return filePaths.map(fp => {
      try {
        return { name: path.basename(fp), content: fs.readFileSync(fp, 'utf8') }
      } catch {
        return { name: path.basename(fp), content: '[Could not read file]' }
      }
    })
  })

  // ── Agentic chat with full filesystem access ───────────────────────────────
  ipcMain.handle('chat-message', async (event, { message, history, projectPath }) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env.local')

    const genAI = new GoogleGenerativeAI(apiKey)

    const tools = [{
      functionDeclarations: [
        {
          name: 'read_file',
          description: 'Read the contents of a file in the project',
          parameters: {
            type: 'OBJECT',
            properties: {
              file_path: { type: 'STRING', description: 'Path relative to project root or absolute' },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'list_directory',
          description: 'List files and folders in a directory',
          parameters: {
            type: 'OBJECT',
            properties: {
              dir_path: { type: 'STRING', description: 'Path relative to project root or absolute' },
            },
            required: ['dir_path'],
          },
        },
        {
          name: 'search_files',
          description: 'Search for a text pattern across all project files',
          parameters: {
            type: 'OBJECT',
            properties: {
              pattern: { type: 'STRING', description: 'Text to search for' },
            },
            required: ['pattern'],
          },
        },
        {
          name: 'update_proposal',
          description: 'Update or extend the proposal canvas shown to the user. Call this to add insights, update sections, or append new findings based on what you read.',
          parameters: {
            type: 'OBJECT',
            properties: {
              patch: {
                type: 'OBJECT',
                description: 'Fields to update on the proposal. All fields optional.',
                properties: {
                  title: { type: 'STRING' },
                  why: { type: 'STRING' },
                  signals: { type: 'ARRAY', items: { type: 'OBJECT' } },
                  ui: { type: 'ARRAY', items: { type: 'OBJECT' } },
                  schema: { type: 'ARRAY', items: { type: 'OBJECT' } },
                  tasks: { type: 'ARRAY', items: { type: 'OBJECT' } },
                },
              },
            },
            required: ['patch'],
          },
        },
      ],
    }]

    function executeTool(name, args) {
      try {
        if (name === 'read_file') {
          const filePath = path.isAbsolute(args.file_path)
            ? args.file_path
            : path.join(projectPath || '', args.file_path)
          // Cap at 6,000 chars (~1,500 tokens) per file
          return fs.readFileSync(filePath, 'utf8').slice(0, 6000)
        }
        if (name === 'list_directory') {
          const dirPath = path.isAbsolute(args.dir_path)
            ? args.dir_path
            : path.join(projectPath || '', args.dir_path)
          const entries = fs.readdirSync(dirPath, { withFileTypes: true })
          return entries
            .filter(e => !['node_modules', '.git', 'dist'].includes(e.name))
            .map(e => `${e.isDirectory() ? '[dir]' : '[file]'} ${e.name}`)
            .join('\n')
        }
        if (name === 'search_files') {
          const results = []
          function searchDir(dir) {
            if (!fs.existsSync(dir)) return
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
              if (['node_modules', '.git', 'dist'].includes(e.name)) continue
              const fullPath = path.join(dir, e.name)
              if (e.isDirectory()) searchDir(fullPath)
              else {
                try {
                  if (fs.readFileSync(fullPath, 'utf8').toLowerCase().includes(args.pattern.toLowerCase()))
                    results.push(fullPath.replace((projectPath || '') + '/', ''))
                } catch {}
              }
            }
          }
          searchDir(projectPath || '')
          // Cap results to avoid huge lists
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

    const systemPrompt = `You are Mira, an AI PM assistant. Use tools to read project files when needed. Be concise. Project root: ${projectPath || 'unknown'}`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', tools })

    // Cap history to last 10 messages to limit token usage
    const trimmedHistory = history.slice(-10)

    const chat = model.startChat({
      systemInstruction: systemPrompt,
      history: trimmedHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    })

    // Agentic loop — handle multiple rounds of tool calls
    let result = await chat.sendMessage(message)
    let fullText = ''
    let iterations = 0
    const MAX_ITERATIONS = 10

    while (iterations++ < MAX_ITERATIONS) {
      const response = result.response

      // Check for tool/function calls
      const functionCalls = response.functionCalls?.() || []

      if (functionCalls.length === 0) {
        // No tool calls — this is the final text response
        try { fullText = response.text() } catch {}
        // Stream it word by word
        const words = fullText.split(' ')
        for (let i = 0; i < words.length; i += 3) {
          event.sender.send('chat-chunk', words.slice(i, i + 3).join(' ') + ' ')
          await new Promise(r => setTimeout(r, 15))
        }
        break
      }

      // Execute all tool calls
      const toolResults = []
      for (const call of functionCalls) {
        const { name, args } = call
        event.sender.send('chat-tool-call', { name, args })
        const toolResult = executeTool(name, args)
        toolResults.push({
          functionResponse: { name, response: { result: toolResult } },
        })
      }

      result = await chat.sendMessage(toolResults)
    }

    return fullText
  })
  ipcMain.handle('generate-proposal', async (event, { prompt, files, projectPath }) => {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env.local')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Build file context
    let fileContext = ''
    if (files?.length) {
      fileContext = files.map(f => `\n\n--- ${f.name} ---\n${f.content.slice(0, 8000)}`).join('')
    }

    // Sample codebase for context
    let codeContext = ''
    if (projectPath) {
      try {
        const srcPath = path.join(projectPath, 'src')
        if (fs.existsSync(srcPath)) {
          const srcFiles = fs.readdirSync(srcPath)
            .filter(f => /\.(jsx?|tsx?)$/.test(f))
            .slice(0, 3)
          codeContext = srcFiles.map(f => {
            const content = fs.readFileSync(path.join(srcPath, f), 'utf8').slice(0, 1000)
            return `\n\n--- ${f} ---\n${content}`
          }).join('')
        }
      } catch {}
    }

    const systemPrompt = `You are Mira, an AI product management assistant. Analyze the context and generate a structured product proposal.

Respond with ONLY valid JSON, no markdown fences, no explanation outside the JSON:
{
  "title": "Short feature title",
  "why": "2-3 sentences grounded in the signals/data provided",
  "signals": [{ "source": "Source name", "quote": "Key insight" }],
  "ui": [{ "file": "path/to/file", "change": "What needs to change" }],
  "schema": [{ "sql": "ALTER TABLE ..." }],
  "tasks": [{ "id": 1, "label": "Task description" }]
}

Generate 3-5 signals, 2-3 UI changes, 1-2 schema changes, 4-6 tasks.`

    const result = await model.generateContentStream([
      { text: systemPrompt },
      { text: `Request: ${prompt}${fileContext}${codeContext}` },
    ])

    let fullText = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      fullText += text
      event.sender.send('proposal-chunk', text)
    }
    event.sender.send('proposal-done', fullText)
    return fullText
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
