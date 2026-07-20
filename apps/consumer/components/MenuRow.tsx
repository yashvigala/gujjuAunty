import Link from "next/link";
import type { ReactNode } from "react";

// One tappable row in a settings list: icon, label, optional sub-label, chevron.
// Renders as a link when `href` is given, otherwise as a button (e.g. Sign out).
type BaseProps = {
  icon: ReactNode;
  label: string;
  description?: string;
  danger?: boolean;
};

const rowClasses =
  "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900";

function RowInner({ icon, label, description, danger }: BaseProps) {
  return (
    <>
      <span
        className={`shrink-0 ${danger ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm ${danger ? "text-red-500" : ""}`}>
          {label}
        </span>
        {description && (
          <span className="block truncate text-xs text-zinc-500">
            {description}
          </span>
        )}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4 shrink-0 text-zinc-400"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </>
  );
}

export function MenuRowLink({ href, ...rest }: BaseProps & { href: string }) {
  return (
    <Link href={href} className={rowClasses}>
      <RowInner {...rest} />
    </Link>
  );
}

export function MenuRowButton({
  onClick,
  ...rest
}: BaseProps & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={rowClasses}>
      <RowInner {...rest} />
    </button>
  );
}

// Groups rows into a bordered card with dividers between them.
export function MenuGroup({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
          {title}
        </h2>
      )}
      <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {children}
      </div>
    </section>
  );
}
