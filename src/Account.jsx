import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

function IntegrationRow({ icon, name, description, connected, connectedNote, onConnect, onDisconnect, connecting, connectLabel }) {
  return (
    <div className="integration-row">
      <div className="integration-info">
        <span className="integration-icon">{icon}</span>
        <div>
          <div className="integration-name">{name}</div>
          <div className="integration-desc">{connected && connectedNote ? connectedNote : description}</div>
        </div>
      </div>
      {connected
        ? <button className="integration-btn integration-btn--disconnect" onClick={onDisconnect}>Disconnect</button>
        : <button className="integration-btn integration-btn--connect" onClick={onConnect} disabled={connecting}>
            {connecting ? 'Connecting…' : (connectLabel || 'Connect')}
          </button>
      }
    </div>
  )
}

function NotionTokenModal({ onSave, onClose }) {
  const [token, setToken] = useState('')
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Connect Notion</h3>
        <p className="modal-desc">
          Create an integration at <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer">notion.so/my-integrations</a>, then paste the Internal Integration Token below.
        </p>
        <input
          className="modal-input"
          placeholder="secret_xxxxxxxxxxxx"
          value={token}
          onChange={e => setToken(e.target.value)}
          autoFocus
        />
        <div className="modal-actions">
          <button className="modal-btn modal-btn--cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn--save" onClick={() => onSave(token)} disabled={!token.trim()}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function Account({ user }) {
  const meta = user.user_metadata
  const avatarUrl = meta?.avatar_url
  const displayName = meta?.full_name || meta?.user_name || '—'
  const provider = user.app_metadata?.provider || 'email'
  const signedInWithGoogle = provider === 'google'

  const [integrations, setIntegrations] = useState({})
  const [connecting, setConnecting] = useState(null)
  const [showNotionModal, setShowNotionModal] = useState(false)

  useEffect(() => { loadIntegrations() }, [])

  async function loadIntegrations() {
    const { data } = await supabase
      .from('user_integrations')
      .select('provider, meta')
      .eq('user_id', user.id)
    if (data) {
      const map = {}
      data.forEach(row => { map[row.provider] = row })
      setIntegrations(map)
    }
  }

  async function connectGoogleSheets() {
    // Redirect to sign in with Google (which also grants Sheets access)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'aipm://auth/callback',
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) alert(error.message)
    else if (data?.url) window.open(data.url, '_blank')
  }

  async function saveNotionToken(token) {
    setShowNotionModal(false)
    setConnecting('notion')
    try {
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: { 'Authorization': `Bearer ${token}`, 'Notion-Version': '2022-06-28' }
      })
      if (!res.ok) throw new Error('Invalid Notion token')
      const notionUser = await res.json()
      await supabase.from('user_integrations').upsert({
        user_id: user.id,
        provider: 'notion',
        access_token: token,
        meta: { name: notionUser.name, bot_id: notionUser.bot?.id },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })
      await loadIntegrations()
    } catch (err) {
      alert(err.message)
    } finally {
      setConnecting(null)
    }
  }

  async function disconnect(p) {
    await supabase.from('user_integrations').delete().eq('user_id', user.id).eq('provider', p)
    await loadIntegrations()
  }

  const sheetsConnected = !!integrations['google_sheets'] || signedInWithGoogle

  return (
    <div className="account-page">
      <div className="account-card">
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" className="account-avatar" />
          : <div className="account-avatar-placeholder">{displayName?.[0]?.toUpperCase()}</div>
        }
        <h2 className="account-display-name">{displayName}</h2>
        <p className="account-email">{user.email}</p>
        <span className="account-provider">via {provider}</span>
        <button className="account-signout" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </div>

      <div className="integrations-section">
        <h3 className="integrations-title">Integrations</h3>
        <p className="integrations-subtitle">Connect data sources so Mira can pull context automatically.</p>

        <IntegrationRow
          icon="📊"
          name="Google Sheets"
          description="Sign in with Google to let Mira read your spreadsheets"
          connectedNote={signedInWithGoogle ? `Connected as ${user.email}` : 'Connected'}
          connected={sheetsConnected}
          connecting={connecting === 'google_sheets'}
          connectLabel="Sign in with Google"
          onConnect={connectGoogleSheets}
          onDisconnect={() => disconnect('google_sheets')}
        />
        <IntegrationRow
          icon="📝"
          name="Notion"
          description="Let Mira query your Notion databases"
          connected={!!integrations['notion']}
          connectedNote={integrations['notion']?.meta?.name ? `Connected as ${integrations['notion'].meta.name}` : 'Connected'}
          connecting={connecting === 'notion'}
          onConnect={() => setShowNotionModal(true)}
          onDisconnect={() => disconnect('notion')}
        />
      </div>

      {showNotionModal && (
        <NotionTokenModal onSave={saveNotionToken} onClose={() => setShowNotionModal(false)} />
      )}
    </div>
  )
}
