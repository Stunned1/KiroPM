import React from 'react'
import { supabase } from './supabase'

export default function Account({ user }) {
  const meta = user.user_metadata
  const avatarUrl = meta?.avatar_url
  const displayName = meta?.full_name || meta?.user_name || '—'
  const provider = user.app_metadata?.provider || 'email'

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
      <div className="feedback-section">
        <h3>We value your feedback!</h3>
        <p>Please take a moment to share your thoughts on our new color scheme and UI changes.</p>
        <button className="feedback-button" onClick={() => alert('Feedback form coming soon!')}>Give Feedback</button>
      </div>
    </div>
  )
}