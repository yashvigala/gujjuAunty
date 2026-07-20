"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { RequireAuth } from "@/components/RequireAuth";
import { PasswordInput } from "@/components/PasswordInput";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return fallback;
}

function ChangePasswordForm() {
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

    // Cheap client check; the real rules are enforced on the server.
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
      <p className="text-sm text-zinc-500">
        You&apos;ll need your current password to set a new one.
      </p>

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
        <span className="text-xs text-zinc-400">At least 8 characters.</span>
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
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
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

export default function ChangePasswordPage() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link
        href="/profile"
        className="mb-4 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        ← Profile
      </Link>
      <h1 className="mb-6 text-3xl font-bold">Change password</h1>

      <RequireAuth message="Please sign in to change your password.">
        <ChangePasswordForm />
      </RequireAuth>
    </main>
  );
}
