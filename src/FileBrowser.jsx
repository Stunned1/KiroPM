import React, { useState, useEffect } from 'react'

function FileIcon({ isDirectory }) {
  if (isDirectory) return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
    </svg>
  )
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg>
  )
}

function DirEntry({ entry, depth = 0 }) {
  const [open, setOpen] = useState(false)
  const [children, setChildren] = useState([])

  async function toggle() {
    if (!entry.isDirectory) return
    if (!open && children.length === 0) {
      const entries = await window.electronFS?.readDirectory(entry.path)
      setChildren(entries || [])
    }
    setOpen((v) => !v)
  }

  return (
    <>
      <li>
        <button
          className={`fb-entry ${entry.isDirectory ? 'fb-dir' : 'fb-file'}`}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
          onClick={toggle}
        >
          <span className="fb-icon"><FileIcon isDirectory={entry.isDirectory} /></span>
          <span className="fb-name">{entry.name}</span>
          {entry.isDirectory && (
            <span className="fb-chevron">{open ? '▾' : '▸'}</span>
          )}
        </button>
      </li>
      {open && children.map((child) => (
        <DirEntry key={child.path} entry={child} depth={depth + 1} />
      ))}
    </>
  )
}

export default function FileBrowser({ project }) {
  const [entries, setEntries] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    window.electronFS?.readDirectory(project.path)
      .then(setEntries)
      .catch((e) => setError(e.message))
  }, [project.path])

  return (
    <div className="file-browser">
      <div className="fb-header">
        <span className="fb-project-name">{project.name}</span>
      </div>
      {error
        ? <p className="fb-error">{error}</p>
        : (
          <ul className="fb-list">
            {entries.map((entry) => (
              <DirEntry key={entry.path} entry={entry} />
            ))}
          </ul>
        )
      }
    </div>
  )
}
