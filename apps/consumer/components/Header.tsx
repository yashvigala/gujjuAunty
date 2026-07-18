"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { useCart } from "@/lib/cart";

// Cart link with a count badge. `hydrated` guards the badge so the server and
// first client render match (the count is only known after localStorage loads).
function CartLink() {
  const { totalCount, hydrated } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={`Cart with ${totalCount} item${totalCount === 1 ? "" : "s"}`}
      className="relative rounded-full border border-zinc-300 px-4 py-1 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      Cart
      {hydrated && totalCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-xs text-white dark:bg-zinc-50 dark:text-zinc-900">
          {totalCount}
        </span>
      )}
    </Link>
  );
}

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
        <CartLink />
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
