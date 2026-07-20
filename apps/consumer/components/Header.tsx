"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      <Link
        href="/profile"
        className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
      >
        {me?.name ?? me?.email ?? "Profile"}
      </Link>
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

// Primary site navigation. `usePathname` lets the current page's link show as
// active, so you always know where you are.
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/orders", label: "Orders" },
  { href: "/about", label: "About us" },
] as const;

function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_LINKS.map((link) => {
        // "/" would otherwise match every route, so it needs an exact check.
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              isActive
                ? "bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <div className="flex min-w-0 items-center gap-6">
        <Link href="/" className="shrink-0 text-lg font-bold">
          GujjuAunty
        </Link>
        <MainNav />
      </div>
      <nav className="flex shrink-0 items-center gap-4">
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
