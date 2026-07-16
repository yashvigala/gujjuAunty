"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

// NEXT_PUBLIC_ vars are inlined at build time. The fallback keeps `next build`
// working before .env.local exists; real requests need the actual URL.
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://unconfigured.convex.cloud";

const convex = new ConvexReactClient(convexUrl);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
