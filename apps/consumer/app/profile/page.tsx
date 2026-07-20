"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@gujjuaunty/backend/convex/_generated/api";

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

function ProfileForm() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Which user's data the form currently holds — lets us fill the fields once
  // the query resolves without stomping on edits the user is making.
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
      setError(errorMessage(err, "Could not save your profile"));
    } finally {
      setSaving(false);
    }
  }

  // Any edit clears the "Saved" confirmation.
  function edit<T>(setter: (value: T) => void) {
    return (value: T) => {
      setSaved(false);
      setter(value);
    };
  }

  if (me === undefined) {
    return <p className="text-zinc-500">Loading…</p>;
  }
  if (me === null) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Email</span>
        <p className="text-sm">{me.email ?? "—"}</p>
        <span className="text-xs text-zinc-400">
          This is your sign-in address and can&apos;t be changed here.
        </span>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => edit(setName)(e.target.value)}
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
          onChange={(e) => edit(setPhone)(e.target.value)}
          className={inputClasses}
          autoComplete="tel"
          placeholder="98765 43210"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm">Delivery address</span>
        <textarea
          value={address}
          onChange={(e) => edit(setAddress)(e.target.value)}
          className={inputClasses}
          rows={3}
          autoComplete="street-address"
          placeholder="Flat / street, area, city, state, PIN"
        />
        <span className="text-xs text-zinc-400">
          We&apos;ll use this as your delivery address at checkout.
        </span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {saving ? "Saving…" : "Save changes"}
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
        <ProfileForm />
      </Authenticated>
    </main>
  );
}
