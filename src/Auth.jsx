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
    // Listen for OAuth redirect from Electron main process
    if (window.electronAuth) {
      window.electronAuth.onOAuthCallback(async (url) => {
        const hashParams = new URLSearchParams(url.split('#')[1])
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        if (accessToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          // If Google login, store provider token for Sheets access
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.provider_token && session?.user?.app_metadata?.provider === 'google') {
            await supabase.from('user_integrations').upsert({
              user_id: session.user.id,
              provider: 'google_sheets',
              access_token: session.provider_token,
              refresh_token: session.provider_refresh_token || null,
              meta: { email: session.user.email },
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,provider' })
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

    if (error) {
      setError(error.message)
    } else if (isSignUp) {
      setMessage('Check your email to confirm your account.')
    }

    setLoading(false)
  }

  async function handleGoogle() {
    setError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'aipm://auth/callback',
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      setError(error.message)
    } else if (data?.url) {
      window.open(data.url, '_blank')
    }
  }

  async function handleGitHub() {
    setError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: 'aipm://auth/callback' },
    })
    if (error) {
      setError(error.message)
    } else if (data?.url) {
      // Open in system browser, not inside Electron
      window.open(data.url, '_blank')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <span className="logo">◈ Mira</span>
        <h2>{isSignUp ? 'Create account' : 'Sign in'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>
        <button className="auth-toggle" onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
        <div className="auth-divider"><span>or</span></div>
        <button className="google-btn" onClick={handleGoogle}>
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
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
