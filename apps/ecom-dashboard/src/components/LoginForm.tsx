import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { ConvexError } from 'convex/values'

type Flow = 'signIn' | 'signUp'

// Errors from Convex arrive as `unknown`. Application errors we threw
// ourselves (ConvexError) carry a safe message in `.data`; anything else gets
// the generic fallback so internals never leak into the UI.
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === 'string') {
    return err.data
  }
  return fallback
}

export function LoginForm() {
  const { signIn } = useAuthActions()

  const [flow, setFlow] = useState<Flow>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn('password', { flow, email, password })
      // No redirect needed: <Authenticated> in App.tsx re-renders on success.
    } catch (err) {
      setError(
        errorMessage(
          err,
          flow === 'signIn'
            ? 'Invalid email or password'
            : 'Could not create account — the password must be at least 8 characters',
        ),
      )
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h2>GujjuAunty Admin</h2>
      <p className="muted">
        {flow === 'signIn'
          ? 'Sign in with an admin account.'
          : 'Create an account (admin access is granted by email).'}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
              required
              minLength={8}
            />
            <button
              type="button" // never submits the form
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4 10 7a12.4 12.4 0 01-2.9 4M6.2 6.2A12.3 12.3 0 002 12c1 3 5 7 10 7a9.6 9.6 0 003.3-.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Please wait…' : flow === 'signIn' ? 'Sign in' : 'Sign up'}
        </button>
      </form>

      <button
        type="button"
        className="linkish"
        onClick={() => {
          setFlow(flow === 'signIn' ? 'signUp' : 'signIn')
          setError(null)
        }}
      >
        {flow === 'signIn'
          ? 'New here? Create an account'
          : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
