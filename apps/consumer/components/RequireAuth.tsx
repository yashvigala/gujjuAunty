"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

// Every signed-in-only page needs the same three states: still checking, not
// signed in, signed in. Centralised here so each page doesn't repeat it.
export function RequireAuth({
  children,
  message = "Please sign in to continue.",
}: {
  children: ReactNode;
  message?: string;
}) {
  return (
    <>
      <AuthLoading>
        <p className="text-zinc-500">Loading…</p>
      </AuthLoading>

      <Unauthenticated>
        <p className="mb-4 text-zinc-500">{message}</p>
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Sign in
        </Link>
      </Unauthenticated>

      <Authenticated>{children}</Authenticated>
    </>
  );
}
