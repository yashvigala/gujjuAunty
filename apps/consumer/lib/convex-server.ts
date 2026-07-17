// Server-side data access for React Server Components.
// (Client components keep using useQuery — live subscriptions; these helpers
// are one-shot fetches over HTTP for SSR/SEO.)
import { cache } from "react";
import { connection } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import type { Id } from "@gujjuaunty/backend/convex/_generated/dataModel";

export function convexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set — copy .env.example to .env.local"
    );
  }
  return url;
}

export async function listItems() {
  // Convex's client generates request IDs with Math.random(), which Next 16
  // forbids during static prerendering — connection() defers this function to
  // request time (the caller's <Suspense> fallback covers the wait).
  await connection();
  return fetchQuery(api.items.list, {}, { url: convexUrl() });
}

// React cache() memoizes per request: generateMetadata and the page component
// both call this, but only one query is sent.
export const getItem = cache(async (id: string) => {
  await connection(); // see listItems
  try {
    // Route params are untrusted strings; `as Id` is sound here because the
    // backend validator (v.id("items")) re-checks it at runtime — a malformed
    // id throws, which we map to "not found".
    return await fetchQuery(
      api.items.get,
      { id: id as Id<"items"> },
      { url: convexUrl() }
    );
  } catch {
    return null;
  }
});
