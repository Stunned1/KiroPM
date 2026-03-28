import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Account from './Account'
import Dashboard from './Dashboard'
import ProjectTab from './ProjectTab'
import Propose from './Propose'
import TasksTab from './TasksTab'
import ProjectDashboard from './ProjectDashboard'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'propose', label: 'Propose' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'project', label: 'Project' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [project, setProject] = useState(null)
  const [boardTasks, setBoardTasks] = useState({ frontend: [], backend: [], qa: [] })
  const [proposeState, setProposeState] = useState({ stage: 'idle', proposal: null, submittedPrompt: '', streamText: '', chatMessages: [], chatInitialized: false, uploadedFiles: [] })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Auth />
  if (!project) return <Dashboard user={session.user} onOpenProject={setProject} />

  const user = session.user
  const avatarUrl = user.user_metadata?.avatar_url
  const displayName = user.user_metadata?.full_name || user.user_metadata?.user_name || user.email

  function handleSendTask(task) {
    // Determine column from task label or default to frontend
    const label = (task.label || '').toLowerCase()
    let column = 'frontend'
    if (label.includes('api') || label.includes('backend') || label.includes('schema') || label.includes('database') || label.includes('server') || label.includes('endpoint')) {
      column = 'backend'
    } else if (label.includes('test') || label.includes('qa') || label.includes('validate') || label.includes('verify')) {
      column = 'qa'
    }

    const newTask = {
      id: `MIRA-${Date.now().toString(36).toUpperCase()}`,
      category: task.category || 'FEATURE',
      title: task.label,
      assignees: [],
      status: null,
      fromProposal: true,
    }

    setBoardTasks(prev => ({
      ...prev,
      [column]: [...prev[column], newTask],
    }))

    // Auto-switch to Tasks tab
    setActiveTab('tasks')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">◈ Mira</span>
          <button className="back-btn" onClick={() => setProject(null)}>← Projects</button>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className={`icon-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button
            className={`account-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="avatar" />
              : <div className="avatar-placeholder">{displayName?.[0]?.toUpperCase()}</div>
            }
            <span className="account-name">{displayName}</span>
          </button>
        </div>
      </aside>

      <main className="content">
        {activeTab === 'account'
          ? <Account user={user} />
          : activeTab === 'settings'
          ? <div className="placeholder"><h2>Settings</h2><p>Settings coming soon.</p></div>
          : activeTab === 'project'
          ? <ProjectTab project={project} />
          : activeTab === 'propose'
          ? <Propose project={project} onSendTask={handleSendTask} proposeState={proposeState} onProposeStateChange={setProposeState} user={user} />
          : activeTab === 'tasks'
          ? <TasksTab boardTasks={boardTasks} setBoardTasks={setBoardTasks} />
          : activeTab === 'dashboard'
          ? <ProjectDashboard project={project} />
          : (
            <div className="placeholder">
              <h2>{NAV_ITEMS.find((i) => i.id === activeTab)?.label}</h2>
              <p>This section is ready to be built out.</p>
            </div>
          )
        }
      </main>
    </div>
  )
}
