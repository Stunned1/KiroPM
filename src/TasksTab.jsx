import { useState } from 'react'

const MOCK_TASKS = {
  frontend: [
    {
      id: 'OBS-241',
      category: 'UI/UX',
      title: 'Refactor Transaction List to Glassmorphism',
      assignees: ['JE', 'AM'],
      comments: 3,
      links: 1,
      status: null,
    },
    {
      id: 'OBS-242',
      category: 'INTEGRATION',
      title: 'Connect Metadata Schema to Editor View',
      assignees: [],
      progress: 65,
      status: 'in_progress',
    },
  ],
  backend: [
    {
      id: 'OBS-245',
      category: 'SECURITY',
      title: 'Implement JWT Rotation for Metadata Endpoints',
      assignees: [],
      priority: 'high',
      status: null,
    },
    {
      id: 'OBS-246',
      category: 'CORE API',
      title: 'Sync Local Schema Cache with Production DB',
      assignees: [],
      status: 'completed',
    },
  ],
  qa: [
    {
      id: 'OBS-249',
      category: 'END-TO-END',
      title: 'Validate Transaction Persistence via Mock API',
      assignees: ['RT'],
      statusLabel: 'Testing in Staging...',
      status: 'testing',
    },
  ],
}

const ALL_TASKS = Object.values(MOCK_TASKS).flat()

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

function TaskCard({ task, selectionState, onToggle }) {
  const catStyle = CATEGORY_COLORS[task.category] || { bg: 'rgba(255,255,255,0.08)', color: '#aaa' }
  const isApproved = selectionState === 'approved'
  const isRejected = selectionState === 'rejected'

  return (
    <div
      className={`task-card ${isApproved ? 'task-card--approved' : ''} ${isRejected ? 'task-card--rejected' : ''}`}
      onClick={() => onToggle(task.id)}
    >
      {/* Selection indicator */}
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

      {/* Approve / Reject quick actions — shown on hover via CSS */}
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

function Column({ col, tasks, selections, onToggle }) {
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
          />
        ))}
      </div>
    </div>
  )
}

// Jira ticket creation modal
function JiraModal({ tasks, onClose, onSubmit }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [project, setProject] = useState('MIRA')
  const [type, setType] = useState('Story')

  async function handleCreate() {
    setLoading(true)
    // TODO: replace with real Jira API / MCP call
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setDone(true)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            {/* Jira-ish icon */}
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
            <p>{tasks.length} ticket{tasks.length > 1 ? 's' : ''} created successfully</p>
            <button className="tasks-btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="modal-fields">
              <div className="modal-field">
                <label>Project key</label>
                <input value={project} onChange={(e) => setProject(e.target.value)} />
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

            <div className="modal-footer">
              <button className="tasks-btn-outline" onClick={onClose}>Cancel</button>
              <button className="tasks-btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating…' : `Create ${tasks.length} ticket${tasks.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TasksTab() {
  const [tasks] = useState(MOCK_TASKS)
  // selections: { [taskId]: 'approved' | 'rejected' }
  const [selections, setSelections] = useState({})
  const [showJira, setShowJira] = useState(false)

  function handleToggle(taskId, forceState) {
    setSelections((prev) => {
      const current = prev[taskId]
      if (forceState) {
        // clicking approve/reject buttons directly
        return { ...prev, [taskId]: current === forceState ? null : forceState }
      }
      // clicking the card body cycles: null → approved → rejected → null
      const next = current === null || !current ? 'approved'
        : current === 'approved' ? 'rejected'
        : null
      return { ...prev, [taskId]: next }
    })
  }

  function clearAll() {
    setSelections({})
  }

  const approvedTasks = ALL_TASKS.filter((t) => selections[t.id] === 'approved')
  const rejectedTasks = ALL_TASKS.filter((t) => selections[t.id] === 'rejected')
  const anySelected = approvedTasks.length > 0 || rejectedTasks.length > 0

  return (
    <div className="tasks-page">
      <div className="tasks-topbar">
        <div>
          <h1 className="tasks-heading">Implementation Tasks</h1>
          <p className="tasks-subheading">Sprint 24: Core Infrastructure Migration</p>
        </div>
        <div className="tasks-actions">
          <button className="tasks-btn-outline" onClick={clearAll} disabled={!anySelected}>
            Clear selection
          </button>
          <button
            className="tasks-btn-primary"
            disabled={approvedTasks.length === 0}
            onClick={() => setShowJira(true)}
          >
            {/* Jira icon */}
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

      {/* Selection summary bar */}
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
            tasks={tasks[col.id] || []}
            selections={selections}
            onToggle={handleToggle}
          />
        ))}
      </div>

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
