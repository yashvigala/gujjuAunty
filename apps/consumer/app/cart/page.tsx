"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { useCart } from "@/lib/cart";
import { formatPaise } from "@/lib/money";

export default function CartPage() {
  const { lines, setQuantity, removeItem, hydrated } = useCart();
  // Live product data — prices/stock/availability are always current, never
  // read from the stored cart.
  const items = useQuery(api.items.list);

  if (!hydrated || items === undefined) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-6 text-3xl font-bold">Your cart</h1>
        <p className="text-zinc-500">Loading…</p>
      </main>
    );
  }

  // Join each stored line to its live item. An item that's missing here was
  // deactivated or deleted since it was added — surface it so the shopper can
  // remove it, and keep it out of the total.
  const byId = new Map(items.map((item) => [item._id, item]));
  const rows = lines.map((line) => ({ line, item: byId.get(line.itemId) ?? null }));
  const available = rows.filter(
    (row): row is { line: typeof row.line; item: NonNullable<typeof row.item> } =>
      row.item !== null
  );

  const total = available.reduce(
    (sum, { line, item }) => sum + item.price * line.quantity,
    0
  );

  if (lines.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-4 text-3xl font-bold">Your cart</h1>
        <p className="text-zinc-500">Your cart is empty.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          ← Browse snacks
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Your cart</h1>

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {rows.map(({ line, item }) => {
          if (item === null) {
            return (
              <li
                key={line.itemId}
                className="flex items-center justify-between gap-4 py-4"
              >
                <span className="text-sm text-zinc-500">
                  This item is no longer available.
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(line.itemId)}
                  className="text-sm text-red-500 underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </li>
            );
          }

          const image = item.imageUrls[0];
          const atStockLimit = line.quantity >= item.stock;

          return (
            <li key={line.itemId} className="flex items-center gap-4 py-4">
              <Link
                href={`/item/${item._id}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
              >
                {image !== undefined ? (
                  <Image
                    src={image}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl">
                    🥨
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/item/${item._id}`} className="font-medium hover:underline">
                  {item.name}
                </Link>
                <p className="text-sm text-zinc-500">{formatPaise(item.price)} each</p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-zinc-300 px-2 py-1 dark:border-zinc-700">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(line.itemId, line.quantity - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  −
                </button>
                <span className="min-w-6 text-center text-sm tabular-nums">
                  {line.quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={atStockLimit}
                  onClick={() => setQuantity(line.itemId, line.quantity + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-lg hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800"
                >
                  ＋
                </button>
              </div>

              <div className="w-24 text-right">
                <p className="font-medium tabular-nums">
                  {formatPaise(item.price * line.quantity)}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(line.itemId)}
                  className="text-xs text-zinc-500 underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <span className="text-lg">Total</span>
        <span className="text-2xl font-bold tabular-nums">{formatPaise(total)}</span>
      </div>

      <div className="mt-6 flex flex-col items-end gap-2">
        {/* Checkout + payment (Razorpay) arrive in the next feature. */}
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-full bg-zinc-200 px-8 py-3 font-medium text-zinc-500 dark:bg-zinc-800"
        >
          Proceed to checkout
        </button>
        <span className="text-xs text-zinc-400">
          Checkout &amp; payment arrive in the next update.
        </span>
      </div>
    </main>
  );
}
