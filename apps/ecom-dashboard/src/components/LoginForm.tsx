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
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
            required
            minLength={8}
          />
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
