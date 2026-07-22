import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@gujjuaunty/backend/convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { formatPaise } from '../lib/money'

type AdminOrder = FunctionReturnType<typeof api.adminOrders.list>[number]

// How each status reads and colours in the dashboard.
const STATUS_META: Record<string, { label: string; className: string }> = {
  pending_payment: { label: 'Awaiting payment', className: 'badge warn' },
  paid: { label: 'Paid', className: 'badge on' },
  processing: { label: 'Packed', className: 'badge on' },
  shipped: { label: 'In transit', className: 'badge info' },
  out_for_delivery: { label: 'Out for delivery', className: 'badge info' },
  delivered: { label: 'Delivered', className: 'badge on' },
  cancelled: { label: 'Cancelled', className: 'badge off' },
}

// Human labels for the actions an admin can take (the raw status → a verb).
const ACTION_LABEL: Record<string, string> = {
  processing: 'Mark packed',
  shipped: 'Mark shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Mark delivered',
}

function OrderRow({ order }: { order: AdminOrder }) {
  const updateStatus = useMutation(api.adminOrders.updateStatus)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const meta = STATUS_META[order.status] ?? { label: order.status, className: 'badge' }
  const itemCount = order.lines.reduce((n, l) => n + l.quantity, 0)

  async function move(status: string) {
    setError(null)
    setBusy(true)
    try {
      // The backend only accepts the specific literals in nextStatuses, so this
      // cast is safe — the buttons are built from that same list.
      await updateStatus({ orderId: order._id, status: status as never })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="order-card">
      <div className="order-head">
        <div>
          <span className={meta.className}>{meta.label}</span>
          <span className="muted small order-date">
            {new Date(order._creationTime).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
        </div>
        <strong>{formatPaise(order.total)}</strong>
      </div>

      <div className="order-body">
        <div className="order-col">
          <span className="field-label">Customer</span>
          <p>{order.customer?.name ?? '—'}</p>
          <p className="muted small">{order.customer?.email ?? 'unknown'}</p>
        </div>

        <div className="order-col">
          <span className="field-label">Deliver to</span>
          <p className="muted small">{order.contact.phone}</p>
          <p className="muted small">{order.contact.address}</p>
        </div>

        <div className="order-col">
          <span className="field-label">
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </span>
          <ul className="order-items">
            {order.lines.map((line) => (
              <li key={line.itemId} className="muted small">
                {line.name} × {line.quantity}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && <p className="error small">{error}</p>}

      {order.nextStatuses.length > 0 && (
        <div className="order-actions">
          {order.nextStatuses.map((next) => (
            <button
              key={next}
              className="btn slim"
              disabled={busy}
              onClick={() => void move(next)}
            >
              {ACTION_LABEL[next] ?? next}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function OrdersPanel() {
  const orders = useQuery(api.adminOrders.list)

  if (orders === undefined) return <p className="muted">Loading orders…</p>

  return (
    <section>
      <div className="panel-head">
        <h1>Orders</h1>
        <span className="muted">{orders.length} total</span>
      </div>

      {orders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <OrderRow key={order._id} order={order} />
          ))}
        </div>
      )}
    </section>
  )
}
