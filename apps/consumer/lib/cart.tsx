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
import { useMutation, useQuery } from "convex/react";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import type { Id } from "@gujjuaunty/backend/convex/_generated/dataModel";

// Cart model:
//  • Signed in  → the cart lives in Convex (see convex/cart.ts). Because Convex
//    queries are live, it syncs across every device/browser for that account in
//    real time.
//  • Guest      → the cart lives in this browser's localStorage.
//  • On login   → the guest cart is merged into the account cart, then cleared.
// Both sources expose the same { itemId, quantity } shape, so the cart page and
// badge don't care which one is active.
export type CartLine = { itemId: Id<"items">; quantity: number };

const GUEST_KEY = "gujju-cart:v1:guest";

type CartApi = {
  lines: CartLine[];
  totalCount: number;
  hydrated: boolean;
  addItem: (itemId: Id<"items">, quantity?: number) => void;
  setQuantity: (itemId: Id<"items">, quantity: number) => void;
  removeItem: (itemId: Id<"items">) => void;
  clear: () => void;
};

const CartContext = createContext<CartApi | null>(null);

// localStorage holds arbitrary (possibly corrupted) text — validate before use.
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

function readGuest(): CartLine[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(GUEST_KEY);
  return raw ? parseLines(raw) : [];
}

function writeGuest(lines: CartLine[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
}

export function CartProvider({ children }: { children: ReactNode }) {
  // undefined while auth resolves, null when signed out, else the user.
  const me = useQuery(api.users.me);
  const authLoading = me === undefined;
  const isSignedIn = me !== undefined && me !== null;

  // Server cart (live). Returns [] when signed out; we just ignore it then.
  const serverCart = useQuery(api.cart.get);
  const addMut = useMutation(api.cart.addItem);
  const setQtyMut = useMutation(api.cart.setQuantity);
  const removeMut = useMutation(api.cart.removeItem);
  const clearMut = useMutation(api.cart.clear);
  const mergeMut = useMutation(api.cart.merge);

  // Guest cart (localStorage) — only used while signed out.
  const [guestLines, setGuestLines] = useState<CartLine[]>([]);
  const [guestLoaded, setGuestLoaded] = useState(false);

  useEffect(() => {
    setGuestLines(readGuest());
    setGuestLoaded(true);
  }, []);

  useEffect(() => {
    if (!guestLoaded) return;
    writeGuest(guestLines);
  }, [guestLines, guestLoaded]);

  // When a guest signs in, fold their local cart into the account cart once.
  const prevSignedIn = useRef<boolean | null>(null);
  useEffect(() => {
    if (authLoading) return;
    if (prevSignedIn.current === false && isSignedIn) {
      const local = readGuest();
      if (local.length > 0) {
        void mergeMut({ lines: local }).then(() => {
          writeGuest([]);
          setGuestLines([]);
        });
      }
    }
    prevSignedIn.current = isSignedIn;
  }, [authLoading, isSignedIn, mergeMut]);

  const lines: CartLine[] = isSignedIn ? (serverCart ?? []) : guestLines;

  // Hydrated once the active source has loaded (avoids a flash of empty cart).
  const hydrated = authLoading
    ? false
    : isSignedIn
      ? serverCart !== undefined
      : guestLoaded;

  const addItem = useCallback(
    (itemId: Id<"items">, quantity = 1) => {
      if (isSignedIn) {
        void addMut({ itemId, quantity });
      } else {
        setGuestLines((prev) => {
          const existing = prev.find((l) => l.itemId === itemId);
          return existing
            ? prev.map((l) =>
                l.itemId === itemId
                  ? { ...l, quantity: l.quantity + quantity }
                  : l
              )
            : [...prev, { itemId, quantity }];
        });
      }
    },
    [isSignedIn, addMut]
  );

  const setQuantity = useCallback(
    (itemId: Id<"items">, quantity: number) => {
      if (isSignedIn) {
        void setQtyMut({ itemId, quantity });
      } else {
        setGuestLines((prev) =>
          quantity <= 0
            ? prev.filter((l) => l.itemId !== itemId)
            : prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l))
        );
      }
    },
    [isSignedIn, setQtyMut]
  );

  const removeItem = useCallback(
    (itemId: Id<"items">) => {
      if (isSignedIn) {
        void removeMut({ itemId });
      } else {
        setGuestLines((prev) => prev.filter((l) => l.itemId !== itemId));
      }
    },
    [isSignedIn, removeMut]
  );

  const clear = useCallback(() => {
    if (isSignedIn) {
      void clearMut({});
    } else {
      setGuestLines([]);
    }
  }, [isSignedIn, clearMut]);

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
