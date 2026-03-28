import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'

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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">◈ AI PM</span>
          <button className="signout-btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
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
      </aside>

      <main className="content">
        <div className="placeholder">
          <h2>{NAV_ITEMS.find((i) => i.id === activeTab)?.label}</h2>
          <p>This section is ready to be built out.</p>
        </div>
      </main>
    </div>
  )
}
