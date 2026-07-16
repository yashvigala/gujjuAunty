// Prices are stored as integer paise in the backend (see convex/schema.ts).
// Rupees only exist at the UI edge: parse on the way in, format on the way out.

export function rupeesToPaise(rupees: string): number | null {
  const n = Number(rupees)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
})

export function formatPaise(paise: number): string {
  return inr.format(paise / 100)
}
