import React from 'react'
import { supabase } from './supabase'

export default function Account({ user }) {
  const meta = user.user_metadata
  const avatarUrl = meta?.avatar_url
  const displayName = meta?.full_name || meta?.user_name || '—'
  const provider = user.app_metadata?.provider || 'email'

  return (
    <div className="account-page">
      <div className="account-content">

        <div className="account-card">
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="account-avatar" />
            : <div className="account-avatar-placeholder">{displayName?.[0]?.toUpperCase()}</div>
          }
          <div className="account-info">
            <h2 className="account-display-name">{displayName}</h2>
            <p className="account-email">{user.email}</p>
            <span className="account-provider">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              via {provider}
            </span>
          </div>
          <button className="account-signout" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>

        <div className="account-section-card">
          <div className="account-section-header">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            <span>Feedback</span>
          </div>
          <p className="account-section-desc">Share your thoughts on KiroPM — feature requests, bugs, or general feedback.</p>
          <button
            className="account-feedback-btn"
            onClick={() => window.open('mailto:feedback@kiropm.com?subject=KiroPM Feedback', '_blank')}
          >
            Send feedback
          </button>
        </div>

      </div>
    </div>
  )
}