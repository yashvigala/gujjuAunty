"use client";

import { useState, type InputHTMLAttributes } from "react";

// A password field with a show/hide toggle, so people can check what they
// typed before submitting. `type` is owned by this component, hence omitted.
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const baseInputClasses =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 pr-10 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={className ?? baseInputClasses}
      />
      <button
        type="button" // never submits the surrounding form
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        // Skipped in tab order: it's a convenience, not a step in the flow.
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {visible ? (
          // Eye with a slash — currently visible, click to hide.
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4 10 7a12.4 12.4 0 01-2.9 4M6.2 6.2A12.3 12.3 0 002 12c1 3 5 7 10 7a9.6 9.6 0 003.3-.6" />
          </svg>
        ) : (
          // Plain eye — currently hidden, click to show.
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
