import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

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

// views: 'home' | 'clone-url' | 'github-repos'
export default function Dashboard({ user, onOpenProject }) {
  const [recent, setRecent] = useState(getRecent)
  const [view, setView] = useState('home')

  // clone-url state
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloning, setCloning] = useState(false)
  const [cloneError, setCloneError] = useState(null)

  // github repos state
  const [repos, setRepos] = useState([])
  const [reposLoading, setReposLoading] = useState(false)
  const [reposError, setReposError] = useState(null)
  const [repoSearch, setRepoSearch] = useState('')
  const [cloningRepo, setCloningRepo] = useState(null)

  const displayName = user.user_metadata?.full_name || user.user_metadata?.user_name || user.email
  const isGitHub = user.app_metadata?.provider === 'github' ||
    user.app_metadata?.providers?.includes('github')

  // Fetch GitHub repos using the user's provider token
  const fetchRepos = useCallback(async () => {
    setReposLoading(true)
    setReposError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.provider_token
      if (!token) throw new Error('No GitHub token found. Please sign in with GitHub.')
      const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)
      setRepos(await res.json())
    } catch (err) {
      setReposError(err.message)
    }
    setReposLoading(false)
  }, [])

  useEffect(() => {
    if (view === 'github-repos' && repos.length === 0) fetchRepos()
  }, [view])

  async function handleOpenProject() {
    if (!window.electronFS) {
      alert('Electron IPC not available — make sure you are running inside Electron.')
      return
    }
    const folderPath = await window.electronFS.openFolderDialog()
    if (!folderPath) return
    const project = { name: folderPath.split('/').pop(), path: folderPath, openedAt: Date.now() }
    addRecent(project)
    setRecent(getRecent())
    onOpenProject(project)
  }

  async function cloneRepo(url, repoName) {
    const dest = await window.electronFS?.openFolderDialog()
    if (!dest) return null
    await window.electronFS.gitClone({ url, destDir: dest })
    return { name: repoName, path: `${dest}/${repoName}`, openedAt: Date.now() }
  }

  async function handleCloneUrl(e) {
    e.preventDefault()
    if (!cloneUrl.trim()) return
    setCloning(true)
    setCloneError(null)
    try {
      const repoName = cloneUrl.split('/').pop().replace(/\.git$/, '')
      const project = await cloneRepo(cloneUrl.trim(), repoName)
      if (!project) { setCloning(false); return }
      addRecent(project)
      setRecent(getRecent())
      onOpenProject(project)
    } catch (err) {
      setCloneError(err.message)
    }
    setCloning(false)
  }

  async function handleCloneGitHubRepo(repo) {
    setCloningRepo(repo.id)
    try {
      const project = await cloneRepo(repo.clone_url, repo.name)
      if (!project) { setCloningRepo(null); return }
      addRecent(project)
      setRecent(getRecent())
      onOpenProject(project)
    } catch (err) {
      setReposError(err.message)
    }
    setCloningRepo(null)
  }

  function openRecent(project) {
    addRecent({ ...project, openedAt: Date.now() })
    setRecent(getRecent())
    onOpenProject(project)
  }

  function formatPath(p) {
    return p.replace(/^\/Users\/[^/]+/, '~')
  }

  const filteredRepos = repos.filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase())
  )

  return (
    <div className="dashboard">
      <div className="dashboard-drag-region" />
      <div className="dashboard-inner">

        {view === 'home' && <>
          <div className="dashboard-hero">
            <span className="dashboard-logo">◈ Mira</span>
            <p className="dashboard-greeting">Welcome back, {displayName.split(' ')[0]}</p>
          </div>

          <div className="dashboard-actions">
            <button className="dash-card" onClick={handleOpenProject}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
              Open project
            </button>
            <button className="dash-card" onClick={() => setView('clone-url')}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
              </svg>
              Clone repo
            </button>
            {isGitHub && (
              <button className="dash-card" onClick={() => setView('github-repos')}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                Your GitHub repos
              </button>
            )}
          </div>

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
        </>}

        {view === 'clone-url' && (
          <div className="subview">
            <button className="subview-back" onClick={() => setView('home')}>← Back</button>
            <h2 className="subview-title">Clone a repository</h2>
            <form onSubmit={handleCloneUrl} className="clone-input-row">
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
            </form>
            {cloneError && <p className="clone-error">{cloneError}</p>}
          </div>
        )}

        {view === 'github-repos' && (
          <div className="subview">
            <button className="subview-back" onClick={() => setView('home')}>← Back</button>
            <h2 className="subview-title">Your GitHub repositories</h2>
            <input
              className="repo-search"
              type="text"
              placeholder="Search repos…"
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              autoFocus
            />
            {reposLoading && <p className="repos-status">Loading…</p>}
            {reposError && <p className="clone-error">{reposError}</p>}
            {!reposLoading && !reposError && (
              <ul className="repo-list">
                {filteredRepos.map((repo) => (
                  <li key={repo.id}>
                    <button
                      className="repo-item"
                      onClick={() => handleCloneGitHubRepo(repo)}
                      disabled={cloningRepo === repo.id}
                    >
                      <div className="repo-item-left">
                        <span className="repo-name">{repo.name}</span>
                        {repo.private && <span className="repo-badge">private</span>}
                        {repo.description && <span className="repo-desc">{repo.description}</span>}
                      </div>
                      <span className="repo-clone-label">
                        {cloningRepo === repo.id ? 'Cloning…' : 'Clone'}
                      </span>
                    </button>
                  </li>
                ))}
                {filteredRepos.length === 0 && (
                  <p className="repos-status">No repos found.</p>
                )}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
