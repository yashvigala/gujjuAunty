"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { RequireAuth } from "@/components/RequireAuth";
import { MenuGroup, MenuRowButton, MenuRowLink } from "@/components/MenuRow";

const iconClasses = "h-5 w-5";
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: iconClasses,
  "aria-hidden": true,
};

// Card at the top: initial-avatar, name and email — the Zomato-style header.
function ProfileHeader() {
  const me = useQuery(api.users.me);
  const displayName = me?.name?.trim() || "Your account";
  const initial = (me?.name?.trim() || me?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="mb-6 flex items-center gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xl font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {initial}
      </span>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold">{displayName}</p>
        <p className="truncate text-sm text-zinc-500">{me?.email ?? "—"}</p>
      </div>
    </div>
  );
}

function ProfileMenu() {
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeader />

      <MenuGroup title="Account">
        <MenuRowLink
          href="/profile/details"
          label="Your details"
          description="Name, phone and delivery address"
          icon={
            <svg {...svgProps}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
        <MenuRowLink
          href="/orders"
          label="Your orders"
          description="Track and review past orders"
          icon={
            <svg {...svgProps}>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
            </svg>
          }
        />
        <MenuRowLink
          href="/profile/password"
          label="Change password"
          description="Update your sign-in password"
          icon={
            <svg {...svgProps}>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />
      </MenuGroup>

      {/* Sign out sits on its own at the very bottom, away from everything
          else, so it's never hit by accident. */}
      <MenuGroup>
        <MenuRowButton
          label="Sign out"
          danger
          onClick={() => {
            void signOut().then(() => router.push("/"));
          }}
          icon={
            <svg {...svgProps}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5M21 12H9" />
            </svg>
          }
        />
      </MenuGroup>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Profile</h1>

      <RequireAuth message="Please sign in to view your profile.">
        <ProfileMenu />
      </RequireAuth>
    </main>
  );
}
