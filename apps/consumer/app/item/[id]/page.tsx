import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getItem } from "@/lib/convex-server";
import { formatPaise } from "@/lib/money";

type Params = Promise<{ id: string }>;

// Per-product <title>/<description> for SEO. Shares the request-memoized
// getItem with the page body, so this does not double-fetch.
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) return { title: "Not found" };
  return {
    title: item.name,
    description: item.description ?? `Buy ${item.name} on GujjuAunty`,
  };
}

async function ItemDetail({ params }: { params: Params }) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const image = item.imageUrls[0];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
        {image !== undefined ? (
          <Image
            src={image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl">
            🥨
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">{item.name}</h1>
          <p className="mt-2 text-2xl">{formatPaise(item.price)}</p>
        </div>

        {item.description !== undefined && (
          <p className="text-zinc-600 dark:text-zinc-400">{item.description}</p>
        )}

        <p className="text-sm">
          {item.stock > 0 ? (
            <span className="text-green-600 dark:text-green-500">
              In stock — {item.stock} available
            </span>
          ) : (
            <span className="text-red-500">Out of stock</span>
          )}
        </p>

        {/* Add-to-cart lands with the cart feature. */}
        <Link
          href="/"
          className="text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          ← Back to all snacks
        </Link>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="aspect-square animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      <div className="flex flex-col gap-4">
        <div className="h-9 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-7 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export default function ItemPage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Suspense fallback={<DetailSkeleton />}>
        <ItemDetail params={params} />
      </Suspense>
    </main>
  );
}
