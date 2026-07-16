import { useQuery } from 'convex/react'
import { api } from '@gujjuaunty/backend/convex/_generated/api'
import './App.css'

// Temporary admin placeholder — proves the dashboard is talking to Convex.
// Real panels (items CRUD, orders) land in later features.
function App() {
  const items = useQuery(api.items.list)

  return (
    <section id="center">
      <div>
        <h1>GujjuAunty Admin</h1>
        <p>
          {items === undefined
            ? 'Connecting to Convex…'
            : `Connected — ${items.length} item${items.length === 1 ? '' : 's'} in the store`}
        </p>
      </div>
    </section>
  )
}

export default App
