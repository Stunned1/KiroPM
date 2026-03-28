import React, { useState } from 'react'

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

function TaskRow({ task, onSendTask, onLabelChange }) {
  const [done, setDone] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSend() {
    if (sent) return
    onSendTask?.(task)
    setSent(true)
  }

  return (
    <li className={`task-row ${done ? 'task-done' : ''}`}>
      <input type="checkbox" checked={done} onChange={() => setDone(v => !v)} />
      {onLabelChange
        ? <EditableText value={task.label} onChange={onLabelChange} />
        : <span>{task.label}</span>
      }
      <button
        className={`send-agent-btn ${sent ? 'send-agent-btn--sent' : ''}`}
        onClick={handleSend}
        disabled={sent}
      >
        {sent ? '✓ Sent to Tasks' : 'Send to Tasks →'}
      </button>
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

function EmptyState({ onGenerate, compact, uploadedFiles = [], onUploadedFiles }) {
  const [prompt, setPrompt] = useState('')

  async function handleUpload() {
    const files = await window.electronFS?.readUpload()
    if (files?.length) onUploadedFiles(prev => [...prev, ...files])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim()) {
      e.preventDefault()
      onGenerate(prompt, uploadedFiles)
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
              onClick={() => onGenerate(prompt, uploadedFiles)}
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
              {uploadedFiles.map((f, i) => (
                <span key={i} className="source-chip active">📄 {f.name}</span>
              ))}
              <button className="source-chip source-upload" onClick={handleUpload}>
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

// ── Editable field ────────────────────────────────────────────────────────────
function EditableText({ value, onChange, multiline, className }) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const ref = React.useRef(null)

  React.useEffect(() => { setDraft(value) }, [value])
  React.useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  if (editing) {
    return multiline
      ? <textarea ref={ref} className={`editable-input editable-textarea ${className || ''}`} value={draft}
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Escape') { setDraft(value); setEditing(false) } }} />
      : <input ref={ref} className={`editable-input ${className || ''}`} value={draft}
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }} />
  }

  return (
    <span className={`editable-text ${className || ''}`} onClick={() => setEditing(true)} title="Click to edit">
      {value}
    </span>
  )
}

// ── Proposal view (main area) ─────────────────────────────────────────────────
function ProposalView({ proposal, onSendTask, onPatch }) {
  return (
    <div className="proposal-view">
      <div className="proposal-header">
        <h1 className="proposal-title">
          <EditableText value={proposal.title} onChange={v => onPatch({ title: v })} className="proposal-title" />
        </h1>
        <p className="proposal-why">
          <EditableText value={proposal.why} onChange={v => onPatch({ why: v })} multiline className="proposal-why-text" />
        </p>
      </div>
      <div className="proposal-sections">
        <section className="proposal-section">
          <h3 className="section-title">Supporting signals</h3>
          <div className="signals-grid">
            {proposal.signals.map((s, i) => (
              <div key={i} className="signal-card">
                <span className="signal-source">
                  <EditableText value={s.source} onChange={v => {
                    const signals = [...proposal.signals]
                    signals[i] = { ...signals[i], source: v }
                    onPatch({ signals })
                  }} />
                </span>
                <p className="signal-quote">
                  "<EditableText value={s.quote} onChange={v => {
                    const signals = [...proposal.signals]
                    signals[i] = { ...signals[i], quote: v }
                    onPatch({ signals })
                  }} multiline />"
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="proposal-section">
          <h3 className="section-title">UI changes</h3>
          <div className="changes-list">
            {proposal.ui.map((item, i) => (
              <div key={i} className="change-item">
                <span className="change-file">
                  <EditableText value={item.file} onChange={v => {
                    const ui = [...proposal.ui]
                    ui[i] = { ...ui[i], file: v }
                    onPatch({ ui })
                  }} />
                </span>
                <p className="change-desc">
                  <EditableText value={item.change} onChange={v => {
                    const ui = [...proposal.ui]
                    ui[i] = { ...ui[i], change: v }
                    onPatch({ ui })
                  }} multiline />
                </p>
              </div>
            ))}
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
            {proposal.tasks.map(task => (
              <TaskRow key={task.id} task={{
                ...task,
                label: task.label,
              }} onSendTask={onSendTask} onLabelChange={v => {
                const tasks = proposal.tasks.map(t => t.id === task.id ? { ...t, label: v } : t)
                onPatch({ tasks })
              }} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

// ── Agent sidebar ─────────────────────────────────────────────────────────────
function AgentSidebar({ prompt, proposal, streamText, done, onClose, project, onProposalPatch, messages, onMessagesChange, initialized, onInitialized, uploadedFiles, userId, onUploadedFiles }) {
  const [toolCalls, setToolCalls] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingReply, setStreamingReply] = useState('')
  const bodyRef = React.useRef(null)
  const initialSent = React.useRef(initialized)

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, streamingReply, toolCalls])

  // Auto-send initial prompt as chat once proposal is done, WITH proposal context
  React.useEffect(() => {
    if (done && !initialSent.current) {
      initialSent.current = true
      onInitialized()
      // Inject proposal context so the model knows what it just generated
      const proposalContext = proposal
        ? `\n\n[CONTEXT — The following proposal was just generated and is visible to the user]:\nTitle: ${proposal.title}\nRationale: ${proposal.why}\nSignals: ${proposal.signals?.map(s => `${s.source}: ${s.quote}`).join('; ')}\nTasks: ${proposal.tasks?.map(t => t.label).join('; ')}\n[END CONTEXT]\n\nThe user's original request was: ${prompt}\nYou can now answer follow-up questions about this proposal.`
        : prompt
      runChat(proposalContext, [])
    }
  }, [done])

  async function runChat(text, history) {
    setSending(true)
    setStreamingReply('')
    setToolCalls([])

    window.electronAI?.removeChatListeners()
    window.electronAI?.onChatChunk(chunk => setStreamingReply(prev => prev + chunk))
    window.electronAI?.onChatToolCall(tool => setToolCalls(prev => [...prev, tool]))
    window.electronAI?.onProposalPatch(patch => onProposalPatch?.(patch))

    try {
      const full = await window.electronAI?.sendChat({
        message: text,
        history,
        projectPath: project?.path,
        uploadedFiles: uploadedFiles || [],
        userId,
      })
      // full is the complete text returned by main process
      // streamingReply has the same content streamed chunk by chunk
      // Use whichever is non-empty
      const finalContent = full || ''
      if (finalContent.trim()) {
        onMessagesChange(prev => [...prev, { role: 'model', content: finalContent }])
      }
    } catch (err) {
      onMessagesChange(prev => [...prev, { role: 'model', content: `Error: ${err.message}` }])
    } finally {
      setStreamingReply('')
      setToolCalls([])
      setSending(false)
    }
  }

  async function sendMessage(text) {
    if (!text.trim() || sending) return
    const userMsg = { role: 'user', content: text }
    const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', content: m.content }))
    onMessagesChange(prev => [...prev, userMsg])
    setInput('')
    await runChat(text, history)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const TOOL_LABELS = {
    read_file: '📄 Reading',
    list_directory: '📁 Listing',
    search_files: '🔍 Searching',
  }

  return (
    <div className="agent-sidebar">
      <div className="agent-header">
        <span className="agent-title">Mira</span>
        <button className="agent-close" onClick={onClose}>✕</button>
      </div>

      <div className="agent-body" ref={bodyRef}>
        <div className="thinking-stream">
          <div className={`thinking-step ${done ? 'thinking-done' : 'thinking-active'}`}>
            {done ? <span className="thinking-check">✓</span> : <span className="thinking-spinner" />}
            {done ? 'Proposal generated' : 'Analyzing with GPT-4o Mini…'}
          </div>
          {!done && streamText && <div className="stream-preview">{streamText.slice(-200)}</div>}
        </div>

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'agent-user-msg' : 'agent-model-msg'}>
            {msg.content}
          </div>
        ))}

        {toolCalls.map((tool, i) => (
          <div key={i} className="agent-tool-call">
            <span className="thinking-spinner" />
            {TOOL_LABELS[tool.name] || tool.name}
            <span className="tool-arg">
              {tool.args?.file_path || tool.args?.dir_path || tool.args?.pattern || ''}
            </span>
          </div>
        ))}

        {streamingReply && (
          <div className="agent-model-msg agent-model-streaming">
            {streamingReply}<span className="streaming-cursor" />
          </div>
        )}
      </div>

      <div className="agent-input-row">
        <button
          className="agent-upload-btn"
          onClick={async () => {
            const files = await window.electronFS?.readUpload()
            if (files?.length) onUploadedFiles(prev => [...prev, ...files])
          }}
          title="Add files"
          disabled={sending}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
        <input
          className="agent-input"
          placeholder="Ask a follow-up…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          className="propose-submit-btn"
          onClick={() => sendMessage(input)}
          disabled={sending || !input.trim()}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Propose({ project, onSendTask, proposeState, onProposeStateChange, user }) {
  const stage = proposeState?.stage ?? 'idle'
  const proposal = proposeState?.proposal ?? null
  const submittedPrompt = proposeState?.submittedPrompt ?? ''
  const streamText = proposeState?.streamText ?? ''
  const error = proposeState?.error ?? null

  function setStage(s) { onProposeStateChange(prev => ({ ...prev, stage: s })) }
  function setProposal(p) {
    onProposeStateChange(prev => ({ ...prev, proposal: typeof p === 'function' ? p(prev.proposal) : p }))
  }
  function setSubmittedPrompt(v) { onProposeStateChange(prev => ({ ...prev, submittedPrompt: v })) }
  function setStreamText(v) { onProposeStateChange(prev => ({ ...prev, streamText: typeof v === 'function' ? v(prev.streamText) : v })) }
  function setError(v) { onProposeStateChange(prev => ({ ...prev, error: v })) }
  function setChatMessages(v) { onProposeStateChange(prev => ({ ...prev, chatMessages: typeof v === 'function' ? v(prev.chatMessages) : v })) }
  function setChatInitialized(v) { onProposeStateChange(prev => ({ ...prev, chatInitialized: v })) }
  function setUploadedFiles(v) { onProposeStateChange(prev => ({ ...prev, uploadedFiles: typeof v === 'function' ? v(prev.uploadedFiles) : v })) }
  const uploadedFiles = proposeState?.uploadedFiles ?? []

  async function handleGenerate(prompt, files) {
    setSubmittedPrompt(prompt)
    setStreamText('')
    setError(null)
    setStage('thinking')

    window.electronAI?.removeListeners()
    window.electronAI?.onChunk(chunk => setStreamText(prev => prev + chunk))

    try {
      const fullText = await window.electronAI?.generateProposal({
        prompt,
        files,
        projectPath: project?.path,
      })

      const jsonMatch = fullText?.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse proposal — try again')
      const parsed = JSON.parse(jsonMatch[0])
      setProposal(parsed)
      setStage('transitioning')
      setTimeout(() => setStage('done'), 400)
    } catch (err) {
      setError(err.message)
      setStage('error')
    }
  }

  const showSidebar = stage === 'transitioning' || stage === 'done'

  return (
    <div className={`propose-layout ${showSidebar ? 'sidebar-open' : ''}`}>
      <div className="propose-main">
        {stage === 'idle' && (
          <EmptyState onGenerate={handleGenerate} uploadedFiles={uploadedFiles} onUploadedFiles={setUploadedFiles} />
        )}
        {stage === 'thinking' && (
          <div className="thinking-center">
            <div className="thinking-center-prompt">{submittedPrompt}</div>
            <div className="thinking-stream">
              <div className="thinking-step thinking-active">
                <span className="thinking-spinner" />
                Analyzing with GPT-4o Mini…
              </div>
              {streamText && (
                <div className="stream-preview">{streamText.slice(-200)}</div>
              )}
            </div>
          </div>
        )}
        {stage === 'transitioning' && (
          <div className="thinking-center thinking-exit">
            <div className="thinking-center-prompt">{submittedPrompt}</div>
            <div className="thinking-stream">
              <div className="thinking-step thinking-done">
                <span className="thinking-check">✓</span>
                Proposal ready
              </div>
            </div>
          </div>
        )}
        {stage === 'error' && (
          <div className="thinking-center">
            <div className="thinking-center-prompt">{submittedPrompt}</div>
            <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>
            <button className="propose-btn" style={{ marginTop: 12 }} onClick={() => setStage('idle')}>
              Try again
            </button>
          </div>
        )}
        {stage === 'done' && proposal && (
          <div className="proposal-fadein">
            <ProposalView proposal={proposal} onSendTask={onSendTask} onPatch={patch => setProposal(prev => prev ? { ...prev, ...patch } : patch)} />
          </div>
        )}
      </div>

      {showSidebar && (
        <AgentSidebar
          prompt={submittedPrompt}
          proposal={proposal}
          streamText={streamText}
          done={stage === 'done'}
          onClose={() => setStage('idle')}
          project={project}
          onProposalPatch={(patch) => setProposal(prev => prev ? { ...prev, ...patch } : patch)}
          messages={proposeState?.chatMessages ?? []}
          onMessagesChange={setChatMessages}
          initialized={proposeState?.chatInitialized ?? false}
          onInitialized={() => setChatInitialized(true)}
          uploadedFiles={uploadedFiles}
          userId={user?.id}
          onUploadedFiles={setUploadedFiles}
        />
      )}
    </div>
  )
}
