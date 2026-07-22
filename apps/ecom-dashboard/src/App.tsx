import { useState } from 'react'
import { Authenticated, AuthLoading, Unauthenticated, useQuery } from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '@gujjuaunty/backend/convex/_generated/api'
import { LoginForm } from './components/LoginForm'
import { ItemsPanel } from './components/ItemsPanel'
import { OrdersPanel } from './components/OrdersPanel'
import './App.css'

type Tab = 'items' | 'orders'

// Auth alone is not enough for the dashboard — the account's email must also
// be in ADMIN_EMAILS (checked server-side in users.me, never trusted from the
// client).
function AdminGate() {
  const me = useQuery(api.users.me)
  const { signOut } = useAuthActions()

  if (me === undefined) {
    return (
      <div className="center">
        <p className="muted">Loading…</p>
      </div>
    )
  }

  if (!me?.isAdmin) {
    return (
      <div className="center">
        <div className="card">
          <h2>Not authorized</h2>
          <p className="muted">
            {me?.email ?? 'This account'} is not an admin. Add it to the{' '}
            <code>ADMIN_EMAILS</code> env var on the Convex deployment to grant
            access.
          </p>
          <button className="btn btn-primary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return <AdminHome email={me.email} />
}

function AdminHome({ email }: { email: string | undefined }) {
  const { signOut } = useAuthActions()
  const [tab, setTab] = useState<Tab>('items')

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <strong>GujjuAunty Admin</strong>
          <nav className="tabs">
            <button
              className={`tab ${tab === 'items' ? 'active' : ''}`}
              onClick={() => setTab('items')}
            >
              Items
            </button>
            <button
              className={`tab ${tab === 'orders' ? 'active' : ''}`}
              onClick={() => setTab('orders')}
            >
              Orders
            </button>
          </nav>
        </div>
        <div className="topbar-right">
          <span className="muted">{email}</span>
          <button className="btn" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="content">
        {tab === 'items' ? <ItemsPanel /> : <OrdersPanel />}
      </main>
    </>
  )
}

function App() {
  return (
    <>
      <AuthLoading>
        <div className="center">
          <p className="muted">Loading…</p>
        </div>
      </AuthLoading>
      <Unauthenticated>
        <div className="center">
          <LoginForm />
        </div>
      </Unauthenticated>
      <Authenticated>
        <AdminGate />
      </Authenticated>
    </>
  )
}

export default App
