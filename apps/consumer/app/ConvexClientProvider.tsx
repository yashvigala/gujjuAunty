"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode } from "react";

// NEXT_PUBLIC_ vars are inlined at build time. The fallback keeps `next build`
// working before .env.local exists; real requests need the actual URL.
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://unconfigured.convex.cloud";

const convex = new ConvexReactClient(convexUrl);

// ConvexAuthProvider wraps ConvexProvider and additionally manages the auth
// tokens (stored in localStorage) that get attached to every Convex request.
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexAuthProvider client={convex}>{children}</ConvexAuthProvider>;
}
