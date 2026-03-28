const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron')
const path = require('path')
const { execFile } = require('child_process')
const fs = require('fs')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const isDev = process.env.NODE_ENV !== 'production'
const PROTOCOL = 'aipm'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const BACKEND_URL = 'http://127.0.0.1:8000'

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

// ── CSV file loading ──────────────────────────────────────────────────────────
function loadCSVContext(projectPath) {
  let csvContext = ''
  const csvFiles = ['reviews.csv', 'synthetic_data.csv']
  
  for (const csvFile of csvFiles) {
    // Try project path first, then app root
    const candidates = [
      projectPath ? path.join(projectPath, csvFile) : null,
      path.join(__dirname, '..', csvFile),
    ].filter(Boolean)
    
    for (const filePath of candidates) {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8')
          csvContext += `\n\n--- ${csvFile} ---\n${content.slice(0, 6000)}`
          break
        }
      } catch {}
    }
  }
  
  return csvContext
}

// ── OpenAI API helper ─────────────────────────────────────────────────────────
async function callOpenAI({ messages, stream = false, tools = null, temperature = 0.7 }) {
  const body = {
    model: 'gpt-4o-mini',
    messages,
    temperature,
  }
  if (tools) body.tools = tools
  if (stream) body.stream = true

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }

  if (stream) {
    return response  // Return the raw response for streaming
  }

  return response.json()
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
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (!trimmed.startsWith('data: ')) continue

      try {
        const json = JSON.parse(trimmed.slice(6))
        const content = json.choices?.[0]?.delta?.content || ''
        if (content) {
          fullText += content
          event.sender.send(channelName, content)
        }
      } catch {}
    }
  }

  return fullText
}

// ── Supabase token lookup (server-side) ───────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supabaseAdmin(userId, provider) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return { data: null }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_integrations?user_id=eq.${userId}&provider=eq.${provider}&select=access_token`,
    { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
  )
  const data = await res.json()
  return { data }
}

function extractNotionProp(prop) {
  if (!prop) return ''
  switch (prop.type) {
    case 'title': return prop.title?.map(t => t.plain_text).join('') || ''
    case 'rich_text': return prop.rich_text?.map(t => t.plain_text).join('') || ''
    case 'number': return String(prop.number ?? '')
    case 'select': return prop.select?.name || ''
    case 'multi_select': return prop.multi_select?.map(s => s.name).join(', ') || ''
    case 'date': return prop.date?.start || ''
    case 'checkbox': return prop.checkbox ? 'true' : 'false'
    case 'url': return prop.url || ''
    case 'email': return prop.email || ''
    default: return ''
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
        { name: 'Context files', extensions: ['txt', 'md', 'csv', 'json', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp'] },
      ],
    })
    if (canceled) return []
    return filePaths.map(fp => {
      try {
        const ext = path.extname(fp).toLowerCase().slice(1)
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)
        if (isImage) {
          const b64 = fs.readFileSync(fp).toString('base64')
          const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
          return { name: path.basename(fp), content: '', imageData: b64, mimeType: mime }
        }
        return { name: path.basename(fp), content: fs.readFileSync(fp, 'utf8') }
      } catch {
        return { name: path.basename(fp), content: '[Could not read file]' }
      }
    })
  })

  // ── Agentic chat with OpenAI + filesystem tools ────────────────────────────
  ipcMain.handle('chat-message', async (event, { message, history, projectPath, uploadedFiles, userId }) => {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in .env.local')

    const csvContext = loadCSVContext(projectPath)

    // Build uploaded file context
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
          parameters: {
            type: 'object',
            properties: {
              file_path: { type: 'string', description: 'Path relative to project root or absolute' },
            },
            required: ['file_path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_directory',
          description: 'List files and folders in a directory',
          parameters: {
            type: 'object',
            properties: {
              dir_path: { type: 'string', description: 'Path relative to project root or absolute' },
            },
            required: ['dir_path'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_files',
          description: 'Search for a text pattern across all project files',
          parameters: {
            type: 'object',
            properties: {
              pattern: { type: 'string', description: 'Text to search for' },
            },
            required: ['pattern'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_proposal',
          description: 'Update or extend the proposal canvas shown to the user.',
          parameters: {
            type: 'object',
            properties: {
              patch: { type: 'object', description: 'Fields to update on the proposal.' },
            },
            required: ['patch'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'read_google_sheet',
          description: 'Read data from a Google Sheet. Use this to pull user data, metrics, or feedback from spreadsheets.',
          parameters: {
            type: 'object',
            properties: {
              spreadsheet_id: { type: 'string', description: 'The Google Sheets spreadsheet ID (from the URL)' },
              range: { type: 'string', description: 'A1 notation range, e.g. "Sheet1!A1:Z100". Defaults to first sheet if omitted.' },
            },
            required: ['spreadsheet_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_notion_database',
          description: 'Query a Notion database to retrieve pages/rows. Use this to pull product data, tasks, or feedback from Notion.',
          parameters: {
            type: 'object',
            properties: {
              database_id: { type: 'string', description: 'The Notion database ID (from the URL or share link)' },
              filter: { type: 'object', description: 'Optional Notion filter object' },
            },
            required: ['database_id'],
          },
        },
      },
    ]

    async function executeTool(name, args) {
      try {
        if (name === 'read_file') {
          const filePath = path.isAbsolute(args.file_path)
            ? args.file_path
            : path.join(projectPath || '', args.file_path)
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
          return results.slice(0, 20).join('\n') || 'No matches found'
        }
        if (name === 'update_proposal') {
          event.sender.send('proposal-patch', args.patch)
          return 'Proposal updated successfully'
        }
        if (name === 'read_google_sheet') {
          const { data: rows } = await supabaseAdmin(userId, 'google_sheets')
          if (!rows?.[0]?.access_token) return 'Google Sheets not connected. Ask the user to connect it in their account settings.'
          const apiKey = rows[0].access_token
          const range = args.range || 'A1:Z1000'
          const url = `https://sheets.googleapis.com/v4/spreadsheets/${args.spreadsheet_id}/values/${encodeURIComponent(range)}?key=${apiKey}`
          const res = await fetch(url)
          if (!res.ok) {
            const err = await res.text()
            return `Google Sheets error: ${err}`
          }
          const json = await res.json()
          const values = json.values || []
          return values.slice(0, 200).map(row => row.join('\t')).join('\n') || 'Sheet is empty'
        }
        if (name === 'query_notion_database') {
          const { data: rows } = await supabaseAdmin(userId, 'notion')
          if (!rows?.[0]?.access_token) return 'Notion not connected. Ask the user to connect it in their account settings.'
          const token = rows[0].access_token
          const body = { page_size: 50 }
          if (args.filter) body.filter = args.filter
          const res = await fetch(`https://api.notion.com/v1/databases/${args.database_id}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })
          if (!res.ok) {
            const err = await res.text()
            return `Notion error: ${err}`
          }
          const json = await res.json()
          // Flatten pages to readable text
          const pages = (json.results || []).map(page => {
            const props = Object.entries(page.properties || {}).map(([key, val]) => {
              const text = extractNotionProp(val)
              return `${key}: ${text}`
            }).join(' | ')
            return props
          })
          return pages.join('\n') || 'No results'
        }
      } catch (err) {
        return `Error: ${err.message}`
      }
    }

    const systemMessage = {
      role: 'system',
      content: `You are Mira, an AI PM assistant using GPT-4o Mini. Use tools to read project files when needed. Be concise. Project root: ${projectPath || 'unknown'}

Available context from product data:
${csvContext || 'No CSV data loaded'}${fileContext ? `\n\nThe user has uploaded the following files as context — use them to inform your answers:\n${fileContext}` : ''}`
    }

    // Build message history
    const messages = [systemMessage]
    const trimmedHistory = (history || []).slice(-10)
    for (const m of trimmedHistory) {
      messages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })
    }
    messages.push(imageFiles.length
      ? {
          role: 'user',
          content: [
            { type: 'text', text: message },
            ...imageFiles.map(f => ({
              type: 'image_url',
              image_url: { url: `data:${f.mimeType};base64,${f.imageData}` }
            }))
          ]
        }
      : { role: 'user', content: message }
    )

    // Agentic loop — handle multiple rounds of tool calls
    let iterations = 0
    const MAX_ITERATIONS = 10
    let fullText = ''

    while (iterations++ < MAX_ITERATIONS) {
      const response = await callOpenAI({ messages, tools })
      const choice = response.choices?.[0]

      if (!choice) break

      const finishReason = choice.finish_reason
      const assistantMsg = choice.message

      if (finishReason === 'tool_calls' || assistantMsg?.tool_calls?.length) {
        // Execute tool calls
        messages.push(assistantMsg)

        for (const toolCall of assistantMsg.tool_calls) {
          const fnName = toolCall.function.name
          let fnArgs = {}
          try { fnArgs = JSON.parse(toolCall.function.arguments) } catch {}
          
          event.sender.send('chat-tool-call', { name: fnName, args: fnArgs })
          const toolResult = await executeTool(fnName, fnArgs)

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult),
          })
        }
        // Continue loop — model will process tool results
      } else {
        // Final text response
        fullText = assistantMsg?.content || ''
        // Stream it word by word
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

  // ── Generate proposal with OpenAI GPT-4o Mini ─────────────────────────────
  ipcMain.handle('generate-proposal', async (event, { prompt, files, projectPath }) => {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set in .env.local')

    // Load CSV context from project
    const csvContext = loadCSVContext(projectPath)

    // Build file context from uploaded files
    let fileContext = ''
    const imageFiles = []
    if (files?.length) {
      const textFiles = files.filter(f => !f.imageData)
      imageFiles.push(...files.filter(f => f.imageData))
      if (textFiles.length) {
        fileContext = '\n\n## UPLOADED CONTEXT FILES\n'
        fileContext += textFiles.map(f => {
          const content = f.content || '[empty or unreadable]'
          return `\n--- ${f.name} ---\n${content.slice(0, 8000)}`
        }).join('')
        console.log(`[generate-proposal] Injecting ${textFiles.length} text file(s):`, textFiles.map(f => f.name))
      }
      if (imageFiles.length) {
        console.log(`[generate-proposal] Injecting ${imageFiles.length} image(s):`, imageFiles.map(f => f.name))
      }
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

    const messages = [
      {
        role: 'system',
        content: `You are Mira, an AI product management assistant using GPT-4o Mini. Analyze the context and generate a structured product proposal.

You have access to REAL USER DATA from CSV files. Use this data to ground your proposals in evidence.

PRODUCT DATA (from CSV files):
${csvContext || 'No CSV data available'}

Respond with ONLY valid JSON, no markdown fences, no explanation outside the JSON:
{
  "title": "Short feature title",
  "why": "2-3 sentences grounded in the signals/data provided. Reference specific Review IDs and metrics.",
  "signals": [{ "source": "Source name (e.g. Review #101 - Persona)", "quote": "Key insight from the data" }],
  "ui": [{ "file": "path/to/file", "change": "What needs to change" }],
  "schema": [{ "sql": "ALTER TABLE ..." }],
  "tasks": [{ "id": 1, "label": "Task description with context on WHY" }]
}

Generate 3-5 signals (cite specific Review IDs), 2-3 UI changes, 1-2 schema changes, 4-6 tasks.
Each signal MUST reference a specific review or data point from the CSV data.
Each task should explain WHY it matters (not just what to do).`
      },
      {
        role: 'user',
        content: imageFiles.length
          ? [
              { type: 'text', text: `Request: ${prompt}${fileContext ? `\n\nIMPORTANT: The user has uploaded the following files as context. Use them to inform the proposal:\n${fileContext}` : ''}${codeContext}` },
              ...imageFiles.map(f => ({
                type: 'image_url',
                image_url: { url: `data:${f.mimeType};base64,${f.imageData}` }
              }))
            ]
          : `Request: ${prompt}${fileContext ? `\n\nIMPORTANT: The user has uploaded the following files as context. Use them to inform the proposal:\n${fileContext}` : ''}${codeContext}`
      }
    ]

    // Stream the response
    const fullText = await streamOpenAI(event, messages, 'proposal-chunk')

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
