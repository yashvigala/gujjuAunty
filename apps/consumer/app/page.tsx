import { Suspense } from "react";
import { listItems } from "@/lib/convex-server";
import { ProductCard } from "@/components/ProductCard";

// Async server component: fetches on every request (no 'use cache'), so the
// storefront always shows current items — and the HTML is fully rendered on
// the server for SEO.
async function ProductGrid() {
  const items = await listItems();

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700">
        The shelves are empty right now — check back soon!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item._id} item={item} />
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="aspect-[4/5] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Homemade Gujarati snacks</h1>
        <p className="mt-1 text-zinc-500">
          Made in small batches, delivered fresh.
        </p>
      </section>
      <Suspense fallback={<GridSkeleton />}>
        <ProductGrid />
      </Suspense>
    </main>
  );
}
