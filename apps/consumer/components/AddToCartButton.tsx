"use client";

import { useCart } from "@/lib/cart";
import type { Id } from "@gujjuaunty/backend/convex/_generated/dataModel";

// Shown on the product detail page. Before the item is in the cart it's a
// single "Add to cart" button; once added it becomes a −/＋ stepper so the
// shopper can adjust quantity without leaving the page. Quantity is capped at
// available stock.
export function AddToCartButton({
  itemId,
  stock,
}: {
  itemId: Id<"items">;
  stock: number;
}) {
  const { lines, addItem, setQuantity, hydrated } = useCart();
  const quantity = lines.find((l) => l.itemId === itemId)?.quantity ?? 0;

  if (stock === 0) {
    return (
      <button
        type="button"
        disabled
        className="w-fit cursor-not-allowed rounded-full bg-zinc-200 px-6 py-2 text-sm font-medium text-zinc-500 dark:bg-zinc-800"
      >
        Out of stock
      </button>
    );
  }

  // Until localStorage is read we don't know the real quantity; render the
  // neutral "Add" state to keep server and client markup identical.
  if (!hydrated || quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => addItem(itemId, 1)}
        className="w-fit rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Add to cart
      </button>
    );
  }

  const atStockLimit = quantity >= stock;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3 rounded-full border border-zinc-300 px-2 py-1 dark:border-zinc-700">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => setQuantity(itemId, quantity - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          −
        </button>
        <span className="min-w-6 text-center text-sm tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          disabled={atStockLimit}
          onClick={() => setQuantity(itemId, quantity + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-lg hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800"
        >
          ＋
        </button>
      </div>
      <span className="text-sm text-zinc-500">
        {atStockLimit ? "Max stock reached" : "In cart"}
      </span>
    </div>
  );
}
