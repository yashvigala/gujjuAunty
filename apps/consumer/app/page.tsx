"use client";

import { useQuery } from "convex/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";

// Temporary storefront placeholder — proves the app is talking to Convex.
// The real product grid lands with the "product listing" feature.
export default function Home() {
  const items = useQuery(api.items.list);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-4xl font-bold">GujjuAunty</h1>
      <p className="text-lg text-zinc-500">
        Homemade Gujarati snacks, delivered.
      </p>
      <p className="rounded-full border border-zinc-300 px-4 py-1 text-sm dark:border-zinc-700">
        {items === undefined
          ? "Connecting to Convex…"
          : `Connected — ${items.length} item${items.length === 1 ? "" : "s"} in the store`}
      </p>
    </main>
  );
}
