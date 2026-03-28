import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

function IntegrationRow({ icon, name, description, connected, onConnect, onDisconnect, connecting }) {
  return (
    <div className="integration-row">
      <div className="integration-info">
        <span className="integration-icon">{icon}</span>
        <div>
          <div className="integration-name">{name}</div>
          <div className="integration-desc">{description}</div>
        </div>
      </div>
      {connected
        ? <button className="integration-btn integration-btn--disconnect" onClick={onDisconnect}>Disconnect</button>
        : <button className="integration-btn integration-btn--connect" onClick={onConnect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect'}
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

  const [integrations, setIntegrations] = useState({})
  const [connecting, setConnecting] = useState(null)
  const [showNotionModal, setShowNotionModal] = useState(false)

  useEffect(() => {
    loadIntegrations()
  }, [])

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
    setConnecting('google_sheets')
    try {
      // Trigger Google OAuth via Supabase — opens browser
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
          redirectTo: 'aipm://oauth',
          queryParams: { access_type: 'offline', prompt: 'consent' },
          skipBrowserRedirect: false,
        },
      })
      if (error) throw error
      // Token will be stored after OAuth callback — poll for it
      const interval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.provider_token) {
          clearInterval(interval)
          await supabase.from('user_integrations').upsert({
            user_id: user.id,
            provider: 'google_sheets',
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token,
            meta: { email: session.user?.email },
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,provider' })
          await loadIntegrations()
          setConnecting(null)
        }
      }, 1000)
      setTimeout(() => { clearInterval(interval); setConnecting(null) }, 60000)
    } catch (err) {
      console.error('Google Sheets connect error:', err)
      setConnecting(null)
    }
  }

  async function saveNotionToken(token) {
    setShowNotionModal(false)
    setConnecting('notion')
    try {
      // Verify token works by hitting Notion API
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
      console.error('Notion connect error:', err)
      alert(err.message)
    } finally {
      setConnecting(null)
    }
  }

  async function disconnect(provider) {
    await supabase.from('user_integrations').delete().eq('user_id', user.id).eq('provider', provider)
    await loadIntegrations()
  }

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
          description="Let Mira read spreadsheets as context"
          connected={!!integrations['google_sheets']}
          connecting={connecting === 'google_sheets'}
          onConnect={connectGoogleSheets}
          onDisconnect={() => disconnect('google_sheets')}
        />
        <IntegrationRow
          icon="📝"
          name="Notion"
          description="Let Mira query your Notion databases"
          connected={!!integrations['notion']}
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
