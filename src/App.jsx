import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Account from './Account'

const NAV_ITEMS = [
  { id: 'signals', label: 'Signals' },
  { id: 'insights', label: 'Insights' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'specs', label: 'Specs' },
  { id: 'tasks', label: 'Tasks' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('signals')
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Auth />

  const user = session.user
  const avatarUrl = user.user_metadata?.avatar_url
  const displayName = user.user_metadata?.full_name || user.user_metadata?.user_name || user.email

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">◈ AI PM</span>
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
