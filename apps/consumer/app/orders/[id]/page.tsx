"use client";

import { use } from "react";
import Link from "next/link";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useQuery,
} from "convex/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import type { Id } from "@gujjuaunty/backend/convex/_generated/dataModel";
import { formatPaise } from "@/lib/money";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderDetail({ orderId }: { orderId: string }) {
  // The id comes from the URL, so it's untrusted — the backend re-validates it
  // and returns null for anything that isn't this customer's own order.
  const order = useQuery(api.orders.get, {
    orderId: orderId as Id<"orders">,
  });

  if (order === undefined) return <p className="text-zinc-500">Loading…</p>;
  if (order === null) {
    return (
      <div>
        <p className="text-zinc-500">Order not found.</p>
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
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-green-300 bg-green-50 p-5 dark:border-green-900 dark:bg-green-950/40">
        <p className="font-medium text-green-800 dark:text-green-300">
          Order placed 🎉
        </p>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          Status: {STATUS_LABELS[order.status] ?? order.status}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Items</h2>
        <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
          {order.lines.map((line) => (
            <li key={line.itemId} className="flex justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate">{line.name}</span>
                <span className="text-sm text-zinc-500">
                  {formatPaise(line.price)} × {line.quantity}
                </span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatPaise(line.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-lg font-bold dark:border-zinc-800">
          <span>Total</span>
          <span className="tabular-nums">{formatPaise(order.total)}</span>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Delivering to</h2>
        <p className="text-sm">{order.contact.name}</p>
        <p className="text-sm text-zinc-500">{order.contact.phone}</p>
        <p className="text-sm whitespace-pre-line text-zinc-500">
          {order.contact.address}
        </p>
      </section>

      <Link
        href="/"
        className="text-sm text-zinc-500 underline-offset-4 hover:underline"
      >
        ← Continue shopping
      </Link>
    </div>
  );
}

export default function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Your order</h1>

      <AuthLoading>
        <p className="text-zinc-500">Loading…</p>
      </AuthLoading>

      <Unauthenticated>
        <p className="mb-4 text-zinc-500">Please sign in to view this order.</p>
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Sign in
        </Link>
      </Unauthenticated>

      <Authenticated>
        <OrderDetail orderId={id} />
      </Authenticated>
    </main>
  );
}
