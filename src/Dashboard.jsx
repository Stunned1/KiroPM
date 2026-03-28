import React, { useState, useEffect } from 'react'

const RECENT_KEY = 'aipm_recent_projects'
const MAX_RECENT = 10

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || [] }
  catch { return [] }
}

function addRecent(project) {
  const list = getRecent().filter((p) => p.path !== project.path)
  localStorage.setItem(RECENT_KEY, JSON.stringify([project, ...list].slice(0, MAX_RECENT)))
}

export default function Dashboard({ user, onOpenProject }) {
  const [recent, setRecent] = useState(getRecent)
  const [cloneUrl, setCloneUrl] = useState('')
  const [showCloneInput, setShowCloneInput] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState(null)

  const displayName = user.user_metadata?.full_name || user.user_metadata?.user_name || user.email

  async function handleOpenProject() {
    if (!window.electronFS) return
    const folderPath = await window.electronFS.openFolderDialog()
    if (!folderPath) return
    const name = folderPath.split('/').pop()
    const project = { name, path: folderPath, openedAt: Date.now() }
    addRecent(project)
    setRecent(getRecent())
    onOpenProject(project)
  }

  async function handleClone(e) {
    e.preventDefault()
    if (!cloneUrl.trim()) return
    setCloning(true)
    setCloneError(null)
    try {
      // Pick destination via dialog, then git clone
      const dest = await window.electronFS?.openFolderDialog()
      if (!dest) { setCloning(false); return }
      const repoName = cloneUrl.split('/').pop().replace(/\.git$/, '')
      const fullPath = `${dest}/${repoName}`
      // We shell out via a hidden approach — for now just record it as a project
      // Real git clone would use Node child_process via IPC
      const project = { name: repoName, path: fullPath, openedAt: Date.now() }
      addRecent(project)
      setRecent(getRecent())
      setCloneUrl('')
      onOpenProject(project)
    } catch (err) {
      setCloneError(err.message)
    }
    setCloning(false)
  }

  function openRecent(project) {
    addRecent({ ...project, openedAt: Date.now() })
    setRecent(getRecent())
    onOpenProject(project)
  }

  function formatPath(p) {
    return p.replace(/^\/Users\/[^/]+/, '~')
  }

  return (
    <div className="dashboard">
      <div className="dashboard-inner">
        <div className="dashboard-hero">
          <span className="dashboard-logo">◈ AI PM</span>
          <p className="dashboard-greeting">Welcome back, {displayName.split(' ')[0]}</p>
        </div>

        <div className="dashboard-actions">
          <button className="dash-card" onClick={handleOpenProject}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
            </svg>
            Open project
          </button>

          <div className="dash-card clone-card" onClick={() => setShowCloneInput((v) => !v)}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
            </svg>
            Clone repo
          </div>
        </div>

        {showCloneInput && (
          <form onSubmit={handleClone} className="clone-input-row">
            <input
              type="text"
              placeholder="https://github.com/user/repo.git"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={cloning || !cloneUrl.trim()}>
              {cloning ? 'Cloning…' : 'Clone'}
            </button>
            {cloneError && <span className="clone-error">{cloneError}</span>}
          </form>
        )}

        {recent.length > 0 && (
          <div className="recent-section">
            <p className="recent-label">Recent projects</p>
            <ul className="recent-list">
              {recent.map((p) => (
                <li key={p.path}>
                  <button className="recent-item" onClick={() => openRecent(p)}>
                    <span className="recent-name">{p.name}</span>
                    <span className="recent-path">{formatPath(p.path)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
