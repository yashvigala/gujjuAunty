"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";

function UserMenu() {
  const { signOut } = useAuthActions();
  const me = useQuery(api.users.me);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-zinc-600 dark:text-zinc-300">
        {me?.name ?? me?.email ?? ""}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full border border-zinc-300 px-4 py-1 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>
    </div>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <Link href="/" className="text-lg font-bold">
        GujjuAunty
      </Link>
      <nav className="flex items-center gap-4">
        <Unauthenticated>
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-4 py-1 text-sm text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Sign in
          </Link>
        </Unauthenticated>
        <Authenticated>
          <UserMenu />
        </Authenticated>
      </nav>
    </header>
  );
}
