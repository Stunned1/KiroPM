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

const COLUMNS = [
  { id: 'frontend', label: 'Frontend', color: '#7c6af7' },
  { id: 'backend', label: 'Backend', color: '#f59e0b' },
  { id: 'qa', label: 'QA & Testing', color: '#f87171' },
]

const CATEGORY_COLORS = {
  'UI/UX':        { bg: 'rgba(124,106,247,0.15)', color: '#a78bfa' },
  'INTEGRATION':  { bg: 'rgba(59,130,246,0.15)',  color: '#60a5fa' },
  'SECURITY':     { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
  'CORE API':     { bg: 'rgba(16,185,129,0.15)',  color: '#34d399' },
  'END-TO-END':   { bg: 'rgba(245,158,11,0.15)',  color: '#fbbf24' },
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

function TaskCard({ task }) {
  const catStyle = CATEGORY_COLORS[task.category] || { bg: 'rgba(255,255,255,0.08)', color: '#aaa' }

  return (
    <div className="task-card">
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
    </div>
  )
}

function Column({ col, tasks }) {
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
        {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
      </div>
    </div>
  )
}

export default function TasksTab() {
  const [tasks] = useState(MOCK_TASKS)

  return (
    <div className="tasks-page">
      <div className="tasks-topbar">
        <div>
          <h1 className="tasks-heading">Implementation Tasks</h1>
          <p className="tasks-subheading">Sprint 24: Core Infrastructure Migration</p>
        </div>
        <div className="tasks-actions">
          <button className="tasks-btn-outline">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
            </svg>
            Create Branch
          </button>
          <button className="tasks-btn-primary">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/>
            </svg>
            Push to Repo
          </button>
        </div>
      </div>

      <div className="tasks-board">
        {COLUMNS.map((col) => (
          <Column key={col.id} col={col} tasks={tasks[col.id] || []} />
        ))}
      </div>
    </div>
  )
}
