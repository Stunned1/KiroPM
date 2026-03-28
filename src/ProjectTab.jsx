import React, { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

const LANG_MAP = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
  json: 'json', css: 'css', html: 'html', md: 'markdown',
  py: 'python', rb: 'ruby', go: 'go', rs: 'rust', sh: 'shell',
}

function getLang(filename) {
  const ext = filename.split('.').pop()
  return LANG_MAP[ext] || 'plaintext'
}

function TreeNode({ entry, depth = 0, onSelectFile }) {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState([])

  async function toggle() {
    if (!entry.isDirectory) { onSelectFile(entry); return }
    if (!open && children.length === 0) {
      const entries = await window.electronFS?.readDirectory(entry.path)
      setChildren(entries || [])
    }
    setOpen(v => !v)
  }

  const isHidden = entry.name.startsWith('.') || entry.name === 'node_modules'

  if (isHidden) return null

  return (
    <>
      <li>
        <button
          className={`tree-entry ${entry.isDirectory ? 'tree-dir' : 'tree-file'}`}
          style={{ paddingLeft: `${10 + depth * 12}px` }}
          onClick={toggle}
        >
          <span className="tree-icon">
            {entry.isDirectory ? (open ? '▾' : '▸') : '·'}
          </span>
          <span className="tree-name">{entry.name}</span>
        </button>
      </li>
      {open && children.map(child => (
        <TreeNode key={child.path} entry={child} depth={depth + 1} onSelectFile={onSelectFile} />
      ))}
    </>
  )
}

export default function ProjectTab({ project }) {
  const [entries, setEntries] = useState([])
  const [openFile, setOpenFile] = useState(null)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.electronFS?.readDirectory(project.path).then(setEntries)
  }, [project.path])

  async function handleSelectFile(entry) {
    if (entry.isDirectory) return
    const text = await window.electronFS?.readFile(entry.path)
    setOpenFile(entry)
    setContent(text || '')
    setDirty(false)
  }

  async function handleSave() {
    if (!openFile || !dirty) return
    setSaving(true)
    await window.electronFS?.writeFile({ filePath: openFile.path, content })
    setDirty(false)
    setSaving(false)
  }

  function handleEditorChange(value) {
    setContent(value || '')
    setDirty(true)
  }

  // Cmd+S to save
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openFile, content, dirty])

  return (
    <div className="project-tab">
      <div className="project-tree">
        <div className="project-tree-header">{project.name}</div>
        <ul className="tree-list">
          {entries.map(entry => (
            <TreeNode key={entry.path} entry={entry} onSelectFile={handleSelectFile} />
          ))}
        </ul>
      </div>

      <div className="project-editor">
        {openFile ? (
          <>
            <div className="editor-topbar">
              <span className="editor-filename">{openFile.name}</span>
              <button
                className="editor-save-btn"
                onClick={handleSave}
                disabled={!dirty || saving}
              >
                {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
              </button>
            </div>
            <Editor
              height="100%"
              theme="vs-dark"
              language={getLang(openFile.name)}
              value={content}
              onChange={handleEditorChange}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 2,
                renderLineHighlight: 'line',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
              }}
            />
          </>
        ) : (
          <div className="editor-empty">
            <p>Select a file to edit</p>
          </div>
        )}
      </div>
    </div>
  )
}
