"use client";

import Link from "next/link";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { formatPaise } from "@/lib/money";

const STATUS_PILL: Record<string, { label: string; classes: string }> = {
  pending_payment: {
    label: "Payment pending",
    classes:
      "border-amber-300 text-amber-700 dark:border-amber-900 dark:text-amber-400",
  },
  paid: {
    label: "Confirmed",
    classes:
      "border-green-300 text-green-700 dark:border-green-900 dark:text-green-400",
  },
  processing: {
    label: "Packed",
    classes:
      "border-green-300 text-green-700 dark:border-green-900 dark:text-green-400",
  },
  shipped: {
    label: "In transit",
    classes:
      "border-blue-300 text-blue-700 dark:border-blue-900 dark:text-blue-400",
  },
  out_for_delivery: {
    label: "Out for delivery",
    classes:
      "border-blue-300 text-blue-700 dark:border-blue-900 dark:text-blue-400",
  },
  delivered: {
    label: "Delivered",
    classes:
      "border-green-300 text-green-700 dark:border-green-900 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelled",
    classes: "border-zinc-300 text-zinc-500 dark:border-zinc-700",
  },
};

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
    new Date(ms)
  );
}

function OrderList() {
  const orders = useQuery(api.orders.listMine);

  if (orders === undefined) return <p className="text-zinc-500">Loading…</p>;

  if (orders.length === 0) {
    return (
      <div>
        <p className="text-zinc-500">You haven&apos;t ordered anything yet.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          ← Browse snacks
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {orders.map((order) => {
        const pill = STATUS_PILL[order.status];
        const itemCount = order.lines.reduce((n, l) => n + l.quantity, 0);
        return (
          <li key={order._id}>
            <Link
              href={`/orders/${order._id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {order.lines.map((l) => l.name).join(", ")}
                </p>
                <p className="text-sm text-zinc-500">
                  {formatDate(order._creationTime)} · {itemCount} item
                  {itemCount === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-medium tabular-nums">
                  {formatPaise(order.total)}
                </span>
                {pill && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${pill.classes}`}
                  >
                    {pill.label}
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function OrdersPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Your orders</h1>

      <AuthLoading>
        <p className="text-zinc-500">Loading…</p>
      </AuthLoading>

      <Unauthenticated>
        <p className="mb-4 text-zinc-500">
          Please sign in to see your order history.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Sign in
        </Link>
      </Unauthenticated>

      <Authenticated>
        <OrderList />
      </Authenticated>
    </main>
  );
}
