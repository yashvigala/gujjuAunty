"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { PasswordInput } from "@/components/PasswordInput";

// Errors arrive as `unknown`. Ours (ConvexError) carry a safe message in
// `.data`; anything else falls back so internals never leak into the UI.
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return fallback;
}

const inputClasses =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

const buttonClasses =
  "w-fit rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-lg font-medium">{title}</h2>
      {description && (
        <p className="mt-1 mb-4 text-sm text-zinc-500">{description}</p>
      )}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

function DeliveryDetails() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me && loadedFor !== me._id) {
      setName(me.name ?? "");
      setPhone(me.phone ?? "");
      setAddress(me.address ?? "");
      setLoadedFor(me._id);
    }
  }, [me, loadedFor]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ name, phone, address });
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, "Could not save your details"));
    } finally {
      setSaving(false);
    }
  }

  if (me === undefined) return <p className="text-zinc-500">Loading…</p>;
  if (me === null) return null;

  const touch = () => setSaved(false);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            touch();
            setName(e.target.value);
          }}
          className={inputClasses}
          autoComplete="name"
          placeholder="Your name"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Phone</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            touch();
            setPhone(e.target.value);
          }}
          className={inputClasses}
          autoComplete="tel"
          placeholder="98765 43210"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Delivery address</span>
        <textarea
          value={address}
          onChange={(e) => {
            touch();
            setAddress(e.target.value);
          }}
          className={inputClasses}
          rows={3}
          autoComplete="street-address"
          placeholder="Flat / street, area, city, state, PIN"
        />
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={buttonClasses}>
          {saving ? "Saving…" : "Save details"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-500">
            Saved ✓
          </span>
        )}
      </div>
    </form>
  );
}

function ChangePassword() {
  const changePassword = useAction(api.users.changePassword);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDone(false);

    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match");
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(errorMessage(err, "Could not change your password"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm">Current password</span>
        <PasswordInput
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">New password</span>
        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Confirm new password</span>
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className={buttonClasses}>
          {saving ? "Updating…" : "Update password"}
        </button>
        {done && (
          <span className="text-sm text-green-600 dark:text-green-500">
            Password updated ✓
          </span>
        )}
      </div>
    </form>
  );
}

function AccountSettings() {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm text-zinc-500">Signed in as</p>
        <p className="text-sm">{me?.email ?? "—"}</p>
        <p className="mt-1 text-xs text-zinc-400">
          Your email is your sign-in ID and can&apos;t be changed here.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          void signOut().then(() => router.push("/"));
        }}
        className="w-fit rounded-full border border-zinc-300 px-6 py-2 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>
    </div>
  );
}

function ProfileContent() {
  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Delivery details"
        description="Used to pre-fill your checkout, so you don't retype them each order."
      >
        <DeliveryDetails />
      </Section>

      <Section title="Your orders">
        <Link
          href="/orders"
          className="text-sm underline underline-offset-4 hover:no-underline"
        >
          View order history →
        </Link>
      </Section>

      <Section
        title="Change password"
        description="You'll need your current password to set a new one."
      >
        <ChangePassword />
      </Section>

      <Section title="Account">
        <AccountSettings />
      </Section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Your profile</h1>

      <AuthLoading>
        <p className="text-zinc-500">Loading…</p>
      </AuthLoading>

      <Unauthenticated>
        <p className="mb-4 text-zinc-500">
          Please sign in to view and edit your profile.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Sign in
        </Link>
      </Unauthenticated>

      <Authenticated>
        <ProfileContent />
      </Authenticated>
    </main>
  );
}
