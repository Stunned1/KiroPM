import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (window.electronAuth) {
      window.electronAuth.onOAuthCallback(async (url) => {
        const hashParams = new URLSearchParams(url.split('#')[1])
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const providerToken = hashParams.get('provider_token')
        if (accessToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (providerToken) {
            localStorage.setItem('github_provider_token', providerToken)
          }
        }
      })
      return () => window.electronAuth.removeOAuthCallback()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else if (isSignUp) setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  async function handleGitHub() {
    setError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { 
        redirectTo: 'aipm://auth/callback',
        skipBrowserRedirect: true,
        scopes: 'repo',
      },
    })
    if (error) setError(error.message)
    else if (data?.url) window.open(data.url, '_blank')
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-logo-row">
          <img src="/mira-logo.png" alt="Mira" className="auth-logo-img" />
          <span className="logo">Mira</span>
        </div>
        <h2>{isSignUp ? 'Create account' : 'Sign in'}</h2>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}</button>
        </form>
        <button className="auth-toggle" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
        <div className="auth-divider"><span>or</span></div>
        <button className="github-btn" onClick={handleGitHub}>
          <svg height="16" viewBox="0 0 16 16" width="16" aria-hidden="true" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Continue with GitHub
        </button>
      </div>
    </div>
  )
}
