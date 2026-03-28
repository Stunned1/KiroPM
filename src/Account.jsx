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

function GoogleSheetsModal({ onSave, onClose }) {
  const [apiKey, setApiKey] = useState('')
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">Connect Google Sheets</h3>
        <p className="modal-desc">
          Create an API key at <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Google Cloud Console</a> with the Google Sheets API enabled, then paste it below. Make sure your sheets are shared with "Anyone with the link".
        </p>
        <input
          className="modal-input"
          placeholder="AIzaSy..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          autoFocus
        />
        <div className="modal-actions">
          <button className="modal-btn modal-btn--cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn modal-btn--save" onClick={() => onSave(apiKey)} disabled={!apiKey.trim()}>Save</button>
        </div>
      </div>
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
  const [showSheetsModal, setShowSheetsModal] = useState(false)

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
    setShowSheetsModal(true)
  }

  async function saveGoogleSheetsKey(apiKey) {
    setShowSheetsModal(false)
    setConnecting('google_sheets')
    try {
      // Quick validation — try fetching the discovery doc
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets?key=${apiKey}`)
      // 400 means key works but no spreadsheet ID given — that's fine
      if (res.status !== 400 && !res.ok && res.status !== 403) throw new Error('Invalid API key')
      await supabase.from('user_integrations').upsert({
        user_id: user.id,
        provider: 'google_sheets',
        access_token: apiKey,
        meta: {},
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' })
      await loadIntegrations()
    } catch (err) {
      console.error('Google Sheets connect error:', err)
      alert(err.message)
    } finally {
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
      {showSheetsModal && (
        <GoogleSheetsModal onSave={saveGoogleSheetsKey} onClose={() => setShowSheetsModal(false)} />
      )}
    </div>
  )
}
