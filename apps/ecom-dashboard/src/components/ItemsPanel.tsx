import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@gujjuaunty/backend/convex/_generated/api'
import type { FunctionReturnType } from 'convex/server'
import { formatPaise } from '../lib/money'
import { ItemForm } from './ItemForm'

type AdminItem = FunctionReturnType<typeof api.items.listAll>[number]

export function ItemsPanel() {
  const items = useQuery(api.items.listAll)
  const update = useMutation(api.items.update)
  const remove = useMutation(api.items.remove)

  // null = closed, 'new' = create form, otherwise the item being edited
  const [editing, setEditing] = useState<AdminItem | 'new' | null>(null)

  if (items === undefined) return <p className="muted">Loading items…</p>

  return (
    <section>
      <div className="panel-head">
        <h1>Items</h1>
        {editing === null && (
          <button className="btn btn-primary slim" onClick={() => setEditing('new')}>
            + New item
          </button>
        )}
      </div>

      {editing !== null && (
        <ItemForm
          item={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
        />
      )}

      {items.length === 0 ? (
        <p className="muted">No items yet — create the first one.</p>
      ) : (
        <table className="items-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className={item.isActive ? '' : 'inactive-row'}>
                <td>
                  {item.imageUrls[0] !== undefined ? (
                    <img className="row-thumb" src={item.imageUrls[0]} alt="" />
                  ) : (
                    <div className="row-thumb placeholder" />
                  )}
                </td>
                <td>
                  <strong>{item.name}</strong>
                  {item.description !== undefined && (
                    <div className="muted small">{item.description}</div>
                  )}
                </td>
                <td>{formatPaise(item.price)}</td>
                <td>{item.stock}</td>
                <td>
                  <span className={item.isActive ? 'badge on' : 'badge off'}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="row-actions">
                  <button className="btn slim" onClick={() => setEditing(item)}>
                    Edit
                  </button>
                  <button
                    className="btn slim"
                    onClick={() =>
                      void update({ id: item._id, isActive: !item.isActive })
                    }
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="btn slim danger"
                    onClick={() => {
                      if (window.confirm(`Delete "${item.name}" permanently?`)) {
                        void remove({ id: item._id })
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
