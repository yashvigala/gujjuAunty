import Image from "next/image";
import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@gujjuaunty/backend/convex/_generated/api";
import { formatPaise } from "@/lib/money";

type Item = FunctionReturnType<typeof api.items.list>[number];

// Server component — no interactivity yet (add-to-cart arrives with the cart
// feature), so no "use client" needed and it renders fully on the server.
export function ProductCard({ item }: { item: Item }) {
  const image = item.imageUrls[0];

  return (
    <Link
      href={`/item/${item._id}`}
      className="group rounded-2xl border border-zinc-200 p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
        {image !== undefined ? (
          <Image
            src={image}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">
            🥨
          </div>
        )}
        {item.stock === 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-zinc-900/80 px-3 py-1 text-xs text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h3 className="truncate font-medium">{item.name}</h3>
        <p className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
          {formatPaise(item.price)}
        </p>
      </div>
    </Link>
  );
}
