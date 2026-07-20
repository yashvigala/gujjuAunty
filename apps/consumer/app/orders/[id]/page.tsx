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

// The banner must never claim more than actually happened — an unpaid order is
// not a confirmed order.
const STATUS_BANNER: Record<
  string,
  { headline: string; detail: string; tone: "good" | "warn" | "bad" }
> = {
  pending_payment: {
    headline: "Payment not completed",
    detail: "This order isn't confirmed. Nothing has been charged.",
    tone: "warn",
  },
  paid: {
    headline: "Order confirmed 🎉",
    detail: "Payment received — we're getting your snacks ready.",
    tone: "good",
  },
  shipped: {
    headline: "On its way 🚚",
    detail: "Your order has shipped.",
    tone: "good",
  },
  delivered: {
    headline: "Delivered ✅",
    detail: "Enjoy your snacks!",
    tone: "good",
  },
  cancelled: {
    headline: "Order cancelled",
    detail: "This order was cancelled and you have not been charged.",
    tone: "bad",
  },
};

const TONE_CLASSES: Record<string, string> = {
  good: "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  bad: "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
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
      {(() => {
        const banner = STATUS_BANNER[order.status];
        if (!banner) return null;
        return (
          <div
            className={`rounded-2xl border p-5 ${TONE_CLASSES[banner.tone]}`}
          >
            <p className="font-medium">{banner.headline}</p>
            <p className="mt-1 text-sm opacity-90">{banner.detail}</p>
            {order.status === "pending_payment" && (
              <Link
                href="/cart"
                className="mt-3 inline-block text-sm underline underline-offset-4"
              >
                Back to cart
              </Link>
            )}
          </div>
        );
      })()}

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
