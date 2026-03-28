import React, { useState, useEffect } from 'react'

// ── Static mock data ──────────────────────────────────────────────────────────
const MOCK_PROPOSAL = {
  title: 'Onboarding checklist for new users',
  why: 'Across 6 customer interviews, new users consistently reported feeling lost after signup. Usage data shows a 62% drop-off within the first session. An interactive onboarding checklist would guide users to their first "aha moment" faster.',
  signals: [
    { source: 'Interview – Sarah K.', quote: '"I signed up and had no idea what to do first."' },
    { source: 'Interview – Marcus T.', quote: '"The empty state was confusing. I almost churned day one."' },
    { source: 'Usage data', quote: '62% of new users never complete a second session.' },
    { source: 'Support ticket #1042', quote: '"How do I get started? The docs aren\'t helping."' },
  ],
  ui: [
    { file: 'src/App.jsx', change: 'Add an <OnboardingChecklist /> component that renders on first login until all steps are complete.' },
    { file: 'src/Dashboard.jsx', change: 'Show a progress bar at the top of the dashboard reflecting checklist completion %.' },
  ],
  schema: [
    { sql: 'ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMPTZ;' },
    { sql: 'ALTER TABLE users ADD COLUMN onboarding_step INTEGER DEFAULT 0;' },
  ],
  tasks: [
    { id: 1, label: 'Create OnboardingChecklist component with 5 steps' },
    { id: 2, label: 'Add onboarding_step and onboarding_completed_at columns to users table' },
    { id: 3, label: 'Wire checklist state to Supabase — persist step progress' },
    { id: 4, label: 'Add progress bar to Dashboard header' },
    { id: 5, label: 'Dismiss checklist once all steps complete' },
  ],
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SignalCard({ signal }) {
  return (
    <div className="signal-card">
      <span className="signal-source">{signal.source}</span>
      <p className="signal-quote">"{signal.quote}"</p>
    </div>
  )
}

function UIChange({ item }) {
  return (
    <div className="change-item">
      <span className="change-file">{item.file}</span>
      <p className="change-desc">{item.change}</p>
    </div>
  )
}

function SchemaChange({ item }) {
  return (
    <div className="schema-item">
      <code className="schema-sql">{item.sql}</code>
      <button className="apply-btn">Apply</button>
    </div>
  )
}

function TaskRow({ task }) {
  const [done, setDone] = useState(false)
  return (
    <li className={`task-row ${done ? 'task-done' : ''}`}>
      <input type="checkbox" checked={done} onChange={() => setDone(v => !v)} />
      <span>{task.label}</span>
      <button className="send-agent-btn">Send to agent →</button>
    </li>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Reduce onboarding drop-off',
  'Improve search experience',
  'Add team collaboration',
  'Fix mobile checkout flow',
]

const SOURCES = [
  { label: 'Customer interviews', icon: '🎙️' },
  { label: 'Usage analytics', icon: '📊' },
  { label: 'Support tickets', icon: '🎫' },
  { label: 'NPS responses', icon: '⭐' },
]

function EmptyState({ onGenerate, compact }) {
  const [prompt, setPrompt] = useState('')
  const [attachedSources, setAttachedSources] = useState([])

  function toggleSource(label) {
    setAttachedSources(prev =>
      prev.includes(label) ? prev.filter(s => s !== label) : [...prev, label]
    )
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      e.preventDefault()
      onGenerate(prompt)
    }
  }

  return (
    <div className={`propose-empty ${compact ? 'propose-empty-compact' : ''}`}>
      <div className="propose-empty-inner">

        {!compact && (
          <div className="propose-greeting">
            <h1>
              <span className="greeting-hello">What should </span>
              <span className="greeting-name">we build?</span>
            </h1>
            <p className="propose-subheading">
              Add context below, then ask Mira what to build next.
            </p>
          </div>
        )}

        <div className="propose-box">
          <textarea
            className="propose-textarea"
            placeholder="Describe what you want to improve, or just ask…"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={compact ? 3 : 4}
          />
          <div className="propose-box-footer">
            {!compact && (
              <div className="suggestion-chips">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion-chip" onClick={() => setPrompt(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <button
              className="propose-submit-btn"
              onClick={() => onGenerate(prompt)}
              disabled={!prompt.trim()}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>

        {!compact && (
          <div className="sources-bar">
            <span className="sources-label">Add context</span>
            <div className="sources-list">
              {SOURCES.map(s => (
                <button
                  key={s.label}
                  className={`source-chip ${attachedSources.includes(s.label) ? 'active' : ''}`}
                  onClick={() => toggleSource(s.label)}
                >
                  <span>{s.icon}</span>
                  {s.label}
                </button>
              ))}
              <button className="source-chip source-upload">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                Upload file
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ── Thinking stream ───────────────────────────────────────────────────────────
const THINKING_STEPS = [
  { delay: 0,    text: 'Reading codebase…' },
  { delay: 900,  text: 'Scanning customer signals…' },
  { delay: 1800, text: 'Analyzing usage patterns…' },
  { delay: 2700, text: 'Generating proposal…' },
]

function ThinkingStream({ done, steps, visibleCount }) {
  return (
    <div className="thinking-stream">
      {steps.slice(0, visibleCount).map((step, i) => (
        <div
          key={i}
          className={`thinking-step ${i === visibleCount - 1 && !done ? 'thinking-active' : 'thinking-done'}`}
        >
          {i === visibleCount - 1 && !done
            ? <span className="thinking-spinner" />
            : <span className="thinking-check">✓</span>
          }
          {step.text}
        </div>
      ))}
      {done && (
        <div className="thinking-step thinking-done">
          <span className="thinking-check">✓</span>
          Proposal ready
        </div>
      )}
    </div>
  )
}

// ── Agent sidebar ─────────────────────────────────────────────────────────────
function AgentSidebar({ prompt, steps, onClose }) {
  return (
    <div className="agent-sidebar">
      <div className="agent-header">
        <span className="agent-title">Mira</span>
        <button className="agent-close" onClick={onClose}>✕</button>
      </div>
      <div className="agent-body">
        <div className="agent-user-msg">{prompt}</div>
        <ThinkingStream done steps={steps} visibleCount={steps.length} />
      </div>
      <div className="agent-input-row">
        <input className="agent-input" placeholder="Ask a follow-up…" />
        <button className="propose-submit-btn">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Proposal view (main area) ─────────────────────────────────────────────────
function ProposalView({ proposal }) {
  return (
    <div className="proposal-view">
      <div className="proposal-header">
        <h1 className="proposal-title">{proposal.title}</h1>
        <p className="proposal-why">{proposal.why}</p>
      </div>
      <div className="proposal-sections">
        <section className="proposal-section">
          <h3 className="section-title">Supporting signals</h3>
          <div className="signals-grid">
            {proposal.signals.map((s, i) => <SignalCard key={i} signal={s} />)}
          </div>
        </section>
        <section className="proposal-section">
          <h3 className="section-title">UI changes</h3>
          <div className="changes-list">
            {proposal.ui.map((item, i) => <UIChange key={i} item={item} />)}
          </div>
        </section>
        <section className="proposal-section">
          <h3 className="section-title">Data model changes</h3>
          <div className="schema-list">
            {proposal.schema.map((item, i) => <SchemaChange key={i} item={item} />)}
          </div>
        </section>
        <section className="proposal-section">
          <h3 className="section-title">Development tasks</h3>
          <ul className="tasks-list">
            {proposal.tasks.map(task => <TaskRow key={task.id} task={task} />)}
          </ul>
        </section>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
// stages: 'idle' | 'thinking' | 'transitioning' | 'done'
export default function Propose() {
  const [stage, setStage] = useState('idle')
  const [submittedPrompt, setSubmittedPrompt] = useState('')
  const [visibleCount, setVisibleCount] = useState(0)

  function handleGenerate(p) {
    setSubmittedPrompt(p)
    setVisibleCount(0)
    setStage('thinking')

    // Reveal steps one by one
    THINKING_STEPS.forEach(({ delay }, i) => {
      setTimeout(() => setVisibleCount(i + 1), delay)
    })

    // When last step done, start transition
    const lastDelay = THINKING_STEPS[THINKING_STEPS.length - 1].delay + 800
    setTimeout(() => setStage('transitioning'), lastDelay)

    // After transition animation, show proposal
    setTimeout(() => setStage('done'), lastDelay + 400)
  }

  const showSidebar = stage === 'transitioning' || stage === 'done'
  const showProposal = stage === 'done'

  return (
    <div className={`propose-layout ${showSidebar ? 'sidebar-open' : ''}`}>
      <div className="propose-main">
        {stage === 'idle' && (
          <EmptyState onGenerate={handleGenerate} />
        )}
        {stage === 'thinking' && (
          <div className="thinking-center">
            <div className="thinking-center-prompt">{submittedPrompt}</div>
            <ThinkingStream
              done={false}
              steps={THINKING_STEPS}
              visibleCount={visibleCount}
            />
          </div>
        )}
        {stage === 'transitioning' && (
          <div className="thinking-center thinking-exit">
            <div className="thinking-center-prompt">{submittedPrompt}</div>
            <ThinkingStream done steps={THINKING_STEPS} visibleCount={THINKING_STEPS.length} />
          </div>
        )}
        {showProposal && (
          <div className="proposal-fadein">
            <ProposalView proposal={MOCK_PROPOSAL} />
          </div>
        )}
      </div>

      {showSidebar && (
        <AgentSidebar
          prompt={submittedPrompt}
          steps={THINKING_STEPS}
          onClose={() => setStage('idle')}
        />
      )}
    </div>
  )
}
