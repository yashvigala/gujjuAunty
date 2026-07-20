"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { RequireAuth } from "@/components/RequireAuth";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return fallback;
}

const inputClasses =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

function DetailsForm() {
  const me = useQuery(api.users.me);
  const updateProfile = useMutation(api.users.updateProfile);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Which user's data the form holds — lets us fill fields once the query
  // resolves without stomping on edits in progress.
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
      <div className="flex flex-col gap-1">
        <span className="text-sm text-zinc-500">Email</span>
        <p className="text-sm">{me.email ?? "—"}</p>
        <span className="text-xs text-zinc-400">
          Your sign-in address — it can&apos;t be changed here.
        </span>
      </div>

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
        <span className="text-xs text-zinc-400">
          Used to pre-fill your checkout.
        </span>
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
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

export default function ProfileDetailsPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link
        href="/profile"
        className="mb-4 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        ← Profile
      </Link>
      <h1 className="mb-6 text-3xl font-bold">Your details</h1>

      <RequireAuth message="Please sign in to edit your details.">
        <DetailsForm />
      </RequireAuth>
    </main>
  );
}
