// Prices are stored as integer paise in the backend (see convex/schema.ts).
// Rupees only exist at the UI edge.
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}
