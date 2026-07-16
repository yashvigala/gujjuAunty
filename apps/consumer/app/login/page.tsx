"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";

type Flow = "signIn" | "signUp";

// Errors from Convex arrive as `unknown`. Application errors we threw
// ourselves (ConvexError) carry a safe message in `.data`; anything else gets
// the generic fallback so internals never leak into the UI.
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return fallback;
}

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [flow, setFlow] = useState<Flow>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("password", {
        flow,
        email,
        password,
        ...(flow === "signUp" ? { name } : {}),
      });
      router.push("/");
    } catch (err) {
      setError(
        errorMessage(
          err,
          flow === "signIn"
            ? "Invalid email or password"
            : "Could not create account — the password must be at least 8 characters",
        ),
      );
      setSubmitting(false);
    }
  }

  const inputClasses =
    "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold">
          {flow === "signIn" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          {flow === "signIn"
            ? "Sign in to order your favourite snacks."
            : "Sign up to start ordering."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {flow === "signUp" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClasses}
              autoComplete="name"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
            required
            minLength={8}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting
              ? "Please wait…"
              : flow === "signIn"
                ? "Sign in"
                : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
          className="mt-4 text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          {flow === "signIn"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
