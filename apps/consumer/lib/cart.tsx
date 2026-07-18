"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Id } from "@gujjuaunty/backend/convex/_generated/dataModel";

// The cart is intentionally client-side only: it lives in the browser and
// survives refreshes via localStorage. Nothing hits the backend until
// checkout (feature 7). We store just the item id + quantity — never a copy of
// the price — so prices/availability are always read fresh from Convex on the
// cart page. A stored price could go stale and let someone pay yesterday's
// amount.
export type CartLine = { itemId: Id<"items">; quantity: number };

// Bump the version suffix if the stored shape ever changes, so old data is
// ignored instead of misread.
const STORAGE_KEY = "gujju-cart:v1";

type CartApi = {
  lines: CartLine[];
  totalCount: number; // sum of all quantities (drives the header badge)
  hydrated: boolean; // false during SSR + first paint, true once localStorage is read
  addItem: (itemId: Id<"items">, quantity?: number) => void;
  setQuantity: (itemId: Id<"items">, quantity: number) => void;
  removeItem: (itemId: Id<"items">) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

// localStorage holds arbitrary (possibly corrupted or tampered) text — validate
// the shape before trusting it, and drop anything that doesn't fit.
function parseLines(raw: string): CartLine[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const out: CartLine[] = [];
  for (const entry of data) {
    if (
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as Record<string, unknown>).itemId === "string" &&
      typeof (entry as Record<string, unknown>).quantity === "number" &&
      Number.isInteger((entry as Record<string, unknown>).quantity) &&
      (entry as { quantity: number }).quantity > 0
    ) {
      const e = entry as { itemId: string; quantity: number };
      out.push({ itemId: e.itemId as Id<"items">, quantity: e.quantity });
    }
  }
  return out;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load once after mount. Starting empty (matching the server render) and then
  // filling in avoids a hydration mismatch.
  useEffect(() => {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) setLines(parseLines(raw));
    setHydrated(true);
  }, []);

  // Persist on every change — but not before the initial load, or we'd clobber
  // the saved cart with the empty starting state.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines, hydrated]);

  const addItem = useCallback((itemId: Id<"items">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === itemId);
      if (existing) {
        return prev.map((l) =>
          l.itemId === itemId ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      return [...prev, { itemId, quantity }];
    });
  }, []);

  const setQuantity = useCallback(
    (itemId: Id<"items">, quantity: number) => {
      // Setting to zero (or below) is the same as removing the line.
      setLines((prev) =>
        quantity <= 0
          ? prev.filter((l) => l.itemId !== itemId)
          : prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l))
      );
    },
    []
  );

  const removeItem = useCallback((itemId: Id<"items">) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );

  const value = useMemo<CartApi>(
    () => ({
      lines,
      totalCount,
      hydrated,
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [lines, totalCount, hydrated, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Throws if used outside the provider — a clear error beats a silent null.
export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (ctx === null) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
