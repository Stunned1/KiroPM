import { useState, useEffect, useRef } from 'react'

const COLUMNS = [
  { id: 'frontend', label: 'Frontend', color: '#7c6af7' },
  { id: 'backend', label: 'Backend', color: '#f59e0b' },
  { id: 'qa', label: 'QA & Testing', color: '#f87171' },
]

const CATEGORY_COLORS = {
  'UI/UX':       { bg: 'rgba(124,106,247,0.15)', color: '#a78bfa' },
  'INTEGRATION': { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'SECURITY':    { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  'CORE API':    { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  'END-TO-END':  { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
  'FEATURE':     { bg: 'rgba(139,92,246,0.15)',   color: '#a78bfa' },
  'BUG':         { bg: 'rgba(239,68,68,0.15)',    color: '#f87171' },
  'TASK':        { bg: 'rgba(59,130,246,0.15)',    color: '#60a5fa' },
}

function Avatar({ initials }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      background: 'var(--accent)', color: '#fff',
      fontSize: 9, fontWeight: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function TaskCard({ task, selectionState, onToggle, isActive, onPreview }) {
  const catStyle = CATEGORY_COLORS[task.category] || { bg: 'var(--border)', color: 'var(--text-muted)' }
  const isApproved = selectionState === 'approved'
  const isRejected = selectionState === 'rejected'

  return (
    <div
      className={`task-card ${isApproved ? 'task-card--approved' : ''} ${isRejected ? 'task-card--rejected' : ''} ${isActive ? 'task-card--active' : ''}`}
      onClick={() => onToggle(task.id)}
    >
      <div className="task-card-select">
        <div className={`task-checkbox ${isApproved ? 'task-checkbox--approved' : ''} ${isRejected ? 'task-checkbox--rejected' : ''}`}>
          {isApproved && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {isRejected && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="M3 3l4 4M7 3l-4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </div>
      </div>

      <div className="task-card-header">
        <span className="task-category" style={{ background: catStyle.bg, color: catStyle.color }}>
          {task.category}
        </span>
        <span className="task-id">{task.id}</span>
      </div>

      <p className="task-title">{task.title}</p>

      {task.priority === 'high' && (
        <span className="task-priority-badge">HIGH PRIORITY</span>
      )}

      {task.status === 'completed' && (
        <div className="task-status-completed">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="6" fill="#22c55e" />
            <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          COMPLETED
        </div>
      )}

      {task.status === 'testing' && task.statusLabel && (
        <div className="task-status-testing">
          <Avatar initials={task.assignees[0]} />
          <span>{task.statusLabel}</span>
        </div>
      )}

      {task.status === 'in_progress' && task.progress != null && (
        <div className="task-progress-wrap">
          <div className="task-progress-bar">
            <div className="task-progress-fill" style={{ width: `${task.progress}%` }} />
          </div>
          <div className="task-progress-footer">
            <span className="task-status-label">IN PROGRESS</span>
            <span className="task-progress-pct">{task.progress}%</span>
          </div>
        </div>
      )}

      {task.fromProposal && !task.status && (
        <div className="task-from-proposal-badge">
          <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          FROM PROPOSAL
        </div>
      )}

      {(task.assignees?.length > 0 || task.comments || task.links) && task.status !== 'testing' && (
        <div className="task-card-footer">
          <div className="task-assignees">
            {task.assignees.map((a) => <Avatar key={a} initials={a} />)}
          </div>
          <div className="task-meta">
            {task.comments != null && (
              <span className="task-meta-item">
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                {task.comments}
              </span>
            )}
            {task.links != null && (
              <span className="task-meta-item">
                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                </svg>
                {task.links}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Preview button for proposal tasks */}
      {task.fromProposal && (
        <button
          className="task-preview-btn"
          onClick={(e) => { e.stopPropagation(); onPreview(task) }}
          title="Preview this feature"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          Preview Feature
        </button>
      )}

      <div className="task-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className={`task-action-btn task-action-approve ${isApproved ? 'active' : ''}`}
          onClick={() => onToggle(task.id, 'approved')}
          title="Approve"
        >
          ✓
        </button>
        <button
          className={`task-action-btn task-action-reject ${isRejected ? 'active' : ''}`}
          onClick={() => onToggle(task.id, 'rejected')}
          title="Reject"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function Column({ col, tasks, selections, onToggle, activeTaskId, onPreview }) {
  return (
    <div className="tasks-column">
      <div className="tasks-col-header">
        <div className="tasks-col-title">
          <span className="tasks-col-dot" style={{ background: col.color }} />
          <span className="tasks-col-name">{col.label}</span>
          <span className="tasks-col-count">({tasks.length})</span>
        </div>
        <div className="tasks-col-actions">
          <button className="tasks-col-btn" title="More options">···</button>
          <button className="tasks-col-btn" title="Add task">+</button>
        </div>
      </div>
      <div className="tasks-col-cards">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selectionState={selections[task.id] || null}
            onToggle={onToggle}
            isActive={task.id === activeTaskId}
            onPreview={onPreview}
          />
        ))}
        {tasks.length === 0 && (
          <div className="tasks-col-empty">
            <p>No tasks yet</p>
            <p className="tasks-col-empty-hint">Tasks sent from proposals will appear here</p>
          </div>
        )}
      </div>
    </div>
  )
}

function JiraModal({ tasks, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [project, setProject] = useState('')
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [type, setType] = useState('Story')
  const [error, setError] = useState(null)
  const [results, setResults] = useState([])

  useEffect(() => {
    if (!window.electronJira) {
      setProjectsLoading(false)
      setError('Jira integration not available')
      return
    }
    window.electronJira.getProjects().then((res) => {
      setProjectsLoading(false)
      if (res.success && res.projects.length > 0) {
        setProjects(res.projects)
        setProject(res.projects[0].key)
      } else {
        setError(res.error || 'No Jira projects found')
      }
    }).catch((err) => {
      setProjectsLoading(false)
      setError(err.message)
    })
  }, [])

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const res = await window.electronJira.createTickets({
        projectKey: project,
        issueType: type,
        tickets: tasks.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description || t.title,
          priority: t.priority,
        })),
      })
      if (res.success) {
        setResults(res.results)
        setDone(true)
      } else {
        const failed = res.results?.filter(r => !r.success) || []
        if (failed.length > 0) {
          setError(`${failed.length} ticket(s) failed: ${failed[0].error}`)
          setResults(res.results)
          setDone(true)
        } else {
          setError(res.error || 'Failed to create tickets')
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to create tickets')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="6" fill="#0052CC"/>
              <path d="M16.5 7l-9 9 4.5 4.5 4.5-4.5 4.5 4.5 4.5-4.5-9-9z" fill="#fff"/>
              <path d="M12 16.5l4.5 4.5 4.5-4.5" stroke="#fff" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="modal-title">Create Jira Tickets</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div className="modal-done">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="18" fill="rgba(34,197,94,0.15)"/>
              <path d="M11 18l5 5 9-10" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="modal-done-text">
              {results.filter(r => r.success).length} of {tasks.length} ticket{tasks.length > 1 ? 's' : ''} created
            </p>
            <div className="modal-results-list">
              {results.map((r) => (
                <div key={r.id} className={`modal-result-row ${r.success ? 'modal-result--success' : 'modal-result--error'}`}>
                  {r.success ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="6" fill="rgba(34,197,94,0.2)"/>
                        <path d="M3.5 6l1.8 1.8 3.2-3.6" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="modal-result-key">{r.key}</span>
                      <span className="modal-result-title">{tasks.find(t => t.id === r.id)?.title}</span>
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="6" fill="rgba(239,68,68,0.2)"/>
                        <path d="M4 4l4 4M8 4l-4 4" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                      <span className="modal-result-title">{tasks.find(t => t.id === r.id)?.title}</span>
                      <span className="modal-result-error">{r.error}</span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <button className="tasks-btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-fields">
              <div className="modal-field">
                <label>Project</label>
                {projectsLoading ? (
                  <div className="modal-field-loading">Loading projects...</div>
                ) : projects.length > 0 ? (
                  <select value={project} onChange={(e) => setProject(e.target.value)}>
                    {projects.map(p => (
                      <option key={p.key} value={p.key}>{p.name} ({p.key})</option>
                    ))}
                  </select>
                ) : (
                  <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="e.g. PROJ" />
                )}
              </div>
              <div className="modal-field">
                <label>Issue type</label>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option>Story</option>
                  <option>Task</option>
                  <option>Bug</option>
                  <option>Epic</option>
                </select>
              </div>
            </div>

            <div className="modal-task-list">
              <p className="modal-section-label">Tickets to create ({tasks.length})</p>
              {tasks.map((t) => (
                <div key={t.id} className="modal-task-row">
                  <span className="modal-task-id">{t.id}</span>
                  <span className="modal-task-title">{t.title}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="modal-error">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="6" fill="rgba(239,68,68,0.2)"/>
                  <path d="M6 3.5v3" stroke="#f87171" strokeWidth="1.2" strokeLinecap="round"/>
                  <circle cx="6" cy="8.5" r="0.5" fill="#f87171"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="modal-footer">
              <button className="tasks-btn-outline" onClick={onClose}>Cancel</button>
              <button
                className="tasks-btn-primary"
                onClick={handleCreate}
                disabled={loading || !project}
              >
                {loading ? 'Creating...' : `Create ${tasks.length} ticket${tasks.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PreviewPanel({ appUrl, previewTask, project, onAccept, onReject, onClose }) {
  const webviewRef = useRef(null)
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [generatedCode, setGeneratedCode] = useState(null)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [acceptResult, setAcceptResult] = useState(null)
  const [error, setError] = useState(null)

  // Generate code when a task is selected for preview
  useEffect(() => {
    if (!previewTask || !window.electronAI) return

    let cancelled = false
    setGenerating(true)
    setStreamText('')
    setGeneratedCode(null)
    setAccepted(false)
    setAcceptResult(null)
    setError(null)

    let fullText = ''

    const onChunk = (chunk) => {
      if (cancelled) return
      fullText += chunk
      setStreamText(fullText.slice(-300))
    }

    const onDone = (result) => {
      if (cancelled) return
      setGenerating(false)
      try {
        const cleaned = result
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        const parsed = JSON.parse(cleaned)
        if (parsed.files && typeof parsed.files === 'object') {
          setGeneratedCode(parsed)
        } else {
          setError('Generated output missing file changes')
        }
      } catch {
        setError('Failed to parse AI response. Try again with a different task.')
      }
    }

    window.electronAI.onFeatureCodeChunk(onChunk)
    window.electronAI.onFeatureCodeDone(onDone)

    window.electronAI.generateFeatureCode({
      taskTitle: previewTask.title,
      projectPath: project?.path,
    }).catch((err) => {
      if (!cancelled) {
        setGenerating(false)
        setError(err?.message || 'Failed to generate code')
      }
    })

    return () => {
      cancelled = true
      window.electronAI.removeFeatureCodeListeners()
    }
  }, [previewTask?.id])

  async function handleAccept() {
    if (!generatedCode?.files || !window.electronAI || !project?.path) return
    setAccepting(true)
    setError(null)
    setAcceptResult(null)

    try {
      const result = await window.electronAI.applyFeatureFiles({
        projectPath: project.path,
        files: generatedCode.files,
        featureId: previewTask.id,
        commitMessage: `feat: ${previewTask.title}`,
      })

      if (result.success) {
        setAccepted(true)
        setAcceptResult(result)
        onAccept(previewTask, generatedCode)

        // If pushed to remote, Vercel will rebuild — reload webview after delay
        if (result.pushed) {
          setTimeout(() => {
            try { webviewRef.current?.reload() } catch {}
          }, 15000)
        }
      } else {
        setError('Failed to write files: ' + (result.error || 'unknown error'))
      }
    } catch (err) {
      setError('Error: ' + (err?.message || 'unknown error'))
    }
    setAccepting(false)
  }

  function handleReject() {
    onReject(previewTask)
  }

  const fileCount = generatedCode?.files ? Object.keys(generatedCode.files).length : 0
  const showActions = previewTask && generatedCode && !generatedCode.error && !generating && !accepted

  return (
    <div className="preview-panel">
      <div className="preview-panel-header">
        <div className="preview-panel-title-row">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          <span className="preview-panel-title">Live Preview</span>
          {appUrl && (
            <span className="preview-panel-url">{appUrl.replace(/^https?:\/\//, '')}</span>
          )}
          {previewTask && (
            <span className="preview-panel-feature-tag">{previewTask.title}</span>
          )}
        </div>
        <div className="preview-panel-actions">
          {showActions && (
            <>
              <button className="preview-accept-btn" onClick={handleAccept} disabled={accepting}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6l2.5 2.5L9.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {accepting ? 'Writing files…' : 'Accept & Apply'}
              </button>
              <button className="preview-reject-btn" onClick={handleReject} disabled={accepting}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Reject
              </button>
            </>
          )}
          <button className="preview-close-btn" onClick={onClose} title="Close preview">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="preview-panel-body">
        <div className="preview-webview-container">
          {appUrl ? (
            <webview
              ref={webviewRef}
              src={appUrl}
              className="preview-webview"
              allowpopups="true"
            />
          ) : (
            <div className="preview-placeholder">
              <svg width="32" height="32" fill="none" stroke="var(--text-muted)" strokeWidth="1" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
              </svg>
              <p>No hosted app URL found</p>
              <p className="preview-placeholder-sub">
                Add a URL to your project's README.md
              </p>
            </div>
          )}
        </div>

        {/* Feature generation status — overlaid at bottom of webview */}
        {previewTask && (
          <div className="preview-feature-status">
            {generating && (
              <div className="preview-generating">
                <div className="preview-generating-header">
                  <div className="preview-spinner" />
                  <span>Generating code for: <strong>{previewTask.title}</strong></span>
                </div>
                {streamText && (
                  <pre className="preview-stream">{streamText}</pre>
                )}
              </div>
            )}

            {generatedCode && !generating && !accepted && (
              <div className="preview-generated">
                <div className="preview-generated-header">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="7" fill="rgba(124,106,247,0.15)"/>
                    <path d="M4.5 7l2 2 3.5-4" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Code ready — {fileCount} file{fileCount !== 1 ? 's' : ''} to modify</span>
                </div>
                {generatedCode.summary && (
                  <p className="preview-summary">{generatedCode.summary}</p>
                )}
                <div className="preview-files-list">
                  {Object.keys(generatedCode.files).map(f => (
                    <div key={f} className="preview-file-item">
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {accepted && acceptResult && (
              <div className="preview-applied">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="9" fill="rgba(34,197,94,0.15)"/>
                  <path d="M5.5 9l2.5 2.5L12.5 6" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div>
                  <p className="preview-applied-title">Feature accepted — {fileCount} file{fileCount !== 1 ? 's' : ''} updated</p>
                  <p className="preview-applied-sub">
                    {acceptResult.pushed
                      ? 'Committed and pushed to remote. Vercel will redeploy — preview will refresh shortly.'
                      : acceptResult.committed
                      ? `Committed locally.${acceptResult.pushError ? ' Push failed — push manually to update the hosted app.' : ''}`
                      : 'Files written to project. No git repo detected — commit and push manually to deploy.'}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="preview-error">
                <span>{error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function TasksTab({ boardTasks, setBoardTasks, project }) {
  const [selections, setSelections] = useState({})
  const [showJira, setShowJira] = useState(false)
  const [appUrl, setAppUrl] = useState(null)
  const [urlLoading, setUrlLoading] = useState(false)
  const [previewTask, setPreviewTask] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  const allTasks = Object.values(boardTasks).flat()

  // Fetch the hosted app URL from the project's README on mount
  useEffect(() => {
    if (!project?.path || !window.electronProject) return

    setUrlLoading(true)
    window.electronProject.getProjectUrl({ projectPath: project.path })
      .then((result) => {
        if (result.url) {
          setAppUrl(result.url)
          setShowPreview(true)
        }
      })
      .catch(() => {})
      .finally(() => setUrlLoading(false))
  }, [project?.path])

  function handleToggle(taskId, forceState) {
    setSelections((prev) => {
      const current = prev[taskId]
      if (forceState) {
        return { ...prev, [taskId]: current === forceState ? null : forceState }
      }
      const next = current === null || !current ? 'approved'
        : current === 'approved' ? 'rejected'
        : null
      return { ...prev, [taskId]: next }
    })
  }

  function clearAll() {
    setSelections({})
  }

  function handlePreview(task) {
    setPreviewTask(task)
    setShowPreview(true)
  }

  function handleAcceptFeature(task) {
    setSelections(prev => ({ ...prev, [task.id]: 'approved' }))
  }

  function handleRejectFeature(task) {
    setSelections(prev => ({ ...prev, [task.id]: 'rejected' }))
    setPreviewTask(null)
  }

  function handleClosePreview() {
    setPreviewTask(null)
    setShowPreview(false)
  }

  const approvedTasks = allTasks.filter((t) => selections[t.id] === 'approved')
  const rejectedTasks = allTasks.filter((t) => selections[t.id] === 'rejected')
  const anySelected = approvedTasks.length > 0 || rejectedTasks.length > 0
  const totalTasks = allTasks.length

  return (
    <div className={`tasks-page ${showPreview ? 'tasks-page--with-preview' : ''}`}>
      <div className="tasks-topbar">
        <div>
          <h1 className="tasks-heading">Implementation Tasks</h1>
          <p className="tasks-subheading">
            {totalTasks > 0
              ? `${totalTasks} task${totalTasks > 1 ? 's' : ''} from proposals`
              : 'Send tasks from Propose to populate the board'}
          </p>
        </div>
        <div className="tasks-actions">
          {!showPreview && appUrl && (
            <button className="tasks-btn-outline" onClick={() => setShowPreview(true)}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Show Preview
            </button>
          )}
          <button className="tasks-btn-outline" onClick={clearAll} disabled={!anySelected}>
            Clear selection
          </button>
          <button
            className="tasks-btn-primary"
            disabled={approvedTasks.length === 0}
            onClick={() => setShowJira(true)}
          >
            <svg width="13" height="13" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="4" fill="rgba(255,255,255,0.2)"/>
              <path d="M16.5 7l-9 9 4.5 4.5 4.5-4.5 4.5 4.5 4.5-4.5-9-9z" fill="#fff"/>
            </svg>
            Create Jira Ticket{approvedTasks.length > 1 ? 's' : ''}
            {approvedTasks.length > 0 && (
              <span className="tasks-btn-badge">{approvedTasks.length}</span>
            )}
          </button>
        </div>
      </div>

      {anySelected && (
        <div className="tasks-selection-bar">
          {approvedTasks.length > 0 && (
            <span className="tasks-sel-approved">
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {approvedTasks.length} approved
            </span>
          )}
          {rejectedTasks.length > 0 && (
            <span className="tasks-sel-rejected">
              <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                <path d="M3 3l4 4M7 3l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {rejectedTasks.length} rejected
            </span>
          )}
        </div>
      )}

      <div className="tasks-board">
        {COLUMNS.map((col) => (
          <Column
            key={col.id}
            col={col}
            tasks={boardTasks[col.id] || []}
            selections={selections}
            onToggle={handleToggle}
            activeTaskId={previewTask?.id}
            onPreview={handlePreview}
          />
        ))}
      </div>

      {showPreview && (
        <PreviewPanel
          appUrl={appUrl}
          previewTask={previewTask}
          project={project}
          onAccept={handleAcceptFeature}
          onReject={handleRejectFeature}
          onClose={handleClosePreview}
        />
      )}

      {showJira && (
        <JiraModal
          tasks={approvedTasks}
          onClose={() => setShowJira(false)}
          onSubmit={() => setShowJira(false)}
        />
      )}
    </div>
  )
}
