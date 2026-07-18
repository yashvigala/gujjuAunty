"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import type { Id } from "@gujjuaunty/backend/convex/_generated/dataModel";

// The cart is client-side (localStorage) and survives refreshes. It is scoped
// to WHO is signed in: each user gets their own cart, and signed-out visitors
// share a "guest" cart. This is what stops one account's cart from showing up
// after sign-out or under a different account. We store only item id +
// quantity — never price — so amounts are always read fresh from Convex.
export type CartLine = { itemId: Id<"items">; quantity: number };

// Bump the version if the stored shape changes. The identity (user id or
// "guest") is appended so carts never collide between accounts.
const KEY_PREFIX = "gujju-cart:v1:";
const GUEST = "guest";

const keyFor = (identity: string) => KEY_PREFIX + identity;

type CartApi = {
  lines: CartLine[];
  totalCount: number; // sum of all quantities (drives the header badge)
  hydrated: boolean; // false until auth resolves + the right cart is loaded
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

function readLines(identity: string): CartLine[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(keyFor(identity));
  return raw ? parseLines(raw) : [];
}

function writeLines(identity: string, lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(identity), JSON.stringify(lines));
}

// Combine two carts by summing quantities per item — used when a guest signs in
// so the items they added beforehand aren't lost.
function mergeLines(a: CartLine[], b: CartLine[]): CartLine[] {
  const totals = new Map<string, number>();
  for (const line of [...a, ...b]) {
    totals.set(line.itemId, (totals.get(line.itemId) ?? 0) + line.quantity);
  }
  return Array.from(totals, ([itemId, quantity]) => ({
    itemId: itemId as Id<"items">,
    quantity,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  // undefined while auth is resolving, null when signed out, else the user.
  const me = useQuery(api.users.me);
  const identity: string | null =
    me === undefined ? null : (me?._id ?? GUEST);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<string | null>(null);
  const prevIdentity = useRef<string | null>(null);

  // Whenever the signed-in identity changes (first load, login, logout, switch)
  // load THAT identity's cart. On a guest→user login, merge the guest cart in.
  useEffect(() => {
    if (identity === null) return; // auth still resolving — leave cart empty
    const prev = prevIdentity.current;

    if (prev === GUEST && identity !== GUEST) {
      const merged = mergeLines(readLines(identity), readLines(GUEST));
      writeLines(identity, merged);
      writeLines(GUEST, []); // guest cart has been absorbed
      setLines(merged);
    } else if (prev !== identity) {
      setLines(readLines(identity));
    }

    prevIdentity.current = identity;
    setActiveIdentity(identity);
  }, [identity]);

  // Persist changes — but only to the identity we've actually loaded, so a cart
  // is never written into the wrong account's slot mid-transition.
  useEffect(() => {
    if (activeIdentity === null || activeIdentity !== identity) return;
    writeLines(activeIdentity, lines);
  }, [lines, activeIdentity, identity]);

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

  const setQuantity = useCallback((itemId: Id<"items">, quantity: number) => {
    // Setting to zero (or below) is the same as removing the line.
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.itemId !== itemId)
        : prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l))
    );
  }, []);

  const removeItem = useCallback((itemId: Id<"items">) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const totalCount = useMemo(
    () => lines.reduce((sum, l) => sum + l.quantity, 0),
    [lines]
  );

  // Hydrated once the loaded cart matches the current identity.
  const hydrated = activeIdentity !== null && activeIdentity === identity;

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
