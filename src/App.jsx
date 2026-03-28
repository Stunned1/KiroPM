import React, { useState } from 'react'

const NAV_ITEMS = [
  { id: 'signals', label: 'Signals' },
  { id: 'insights', label: 'Insights' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'specs', label: 'Specs' },
  { id: 'tasks', label: 'Tasks' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('signals')

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
