"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useAction,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@gujjuaunty/backend/convex/_generated/api";
import { useCart } from "@/lib/cart";
import { formatPaise } from "@/lib/money";
import { openRazorpayCheckout } from "@/lib/razorpay";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  return fallback;
}

const inputClasses =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400";

function CheckoutForm() {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const items = useQuery(api.items.list);
  const placeOrder = useMutation(api.orders.place);
  const cancelPending = useMutation(api.orders.cancelPending);
  const createRazorpayOrder = useAction(api.payments.createRazorpayOrder);
  const verifyPayment = useAction(api.payments.verifyPayment);
  const { lines, hydrated } = useCart();

  // Delivery details — required. Pre-filled from the saved profile so a
  // returning customer only has to confirm.
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me && loadedFor !== me._id) {
      setName(me.name ?? "");
      setPhone(me.phone ?? "");
      setAddress(me.address ?? "");
      setLoadedFor(me._id);
    }
  }, [me, loadedFor]);

  if (me === undefined || items === undefined || !hydrated) {
    return <p className="text-zinc-500">Loading…</p>;
  }

  const byId = new Map(items.map((item) => [item._id, item]));
  const rows = lines.flatMap((line) => {
    const item = byId.get(line.itemId);
    return item ? [{ line, item }] : [];
  });
  const total = rows.reduce(
    (sum, { line, item }) => sum + item.price * line.quantity,
    0
  );

  if (rows.length === 0) {
    return (
      <div>
        <p className="text-zinc-500">Your cart is empty.</p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          ← Browse snacks
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPlacing(true);

    let orderId;
    try {
      // 1. Create our order (reserves stock, empties the cart, saves details).
      orderId = await placeOrder({ name, phone, address });
    } catch (err) {
      setError(errorMessage(err, "Could not place your order"));
      setPlacing(false);
      return;
    }

    try {
      // 2. Ask Razorpay (server-side, using the secret) for a payment order.
      const { razorpayOrderId, amount, keyId } = await createRazorpayOrder({
        orderId,
      });

      // 3. Let the customer pay in Razorpay's popup.
      const result = await openRazorpayCheckout({
        keyId,
        amount,
        razorpayOrderId,
        customerName: name,
        customerPhone: phone,
        customerEmail: me?.email ?? undefined,
      });

      // Nothing is confirmed unless the customer actually paid. On dismiss or
      // failure we stay put with the cart untouched, so they can change their
      // mind, edit the cart, or simply walk away.
      if (result.outcome !== "paid") {
        await cancelPending({ orderId });
        setError(
          result.outcome === "dismissed"
            ? "Payment cancelled — your cart is still here whenever you're ready."
            : `Payment failed: ${result.message}. Your cart is unchanged.`
        );
        setPlacing(false);
        return;
      }

      // 4. Prove the payment is genuine before trusting it. The browser's
      //    "success" alone is never enough — the server checks the signature,
      //    and only then are the cart and stock updated.
      await verifyPayment({
        orderId,
        razorpayOrderId: result.response.razorpay_order_id,
        razorpayPaymentId: result.response.razorpay_payment_id,
        razorpaySignature: result.response.razorpay_signature,
      });

      router.push(`/orders/${orderId}`);
    } catch (err) {
      // Payment didn't complete — release the attempt so the customer isn't
      // left with a phantom order.
      await cancelPending({ orderId }).catch(() => {});
      setError(errorMessage(err, "Payment could not be completed"));
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Delivery details</h2>
        <p className="-mt-2 text-sm text-zinc-500">
          All fields are required. We&apos;ll save them for your next order.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-sm">
            Full name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClasses}
            autoComplete="name"
            placeholder="Who should we deliver to?"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">
            Mobile number <span className="text-red-500">*</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClasses}
            autoComplete="tel"
            placeholder="98765 43210"
            required
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm">
            Delivery address <span className="text-red-500">*</span>
          </span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputClasses}
            rows={3}
            autoComplete="street-address"
            placeholder="Flat / street, area, city, state, PIN"
            required
          />
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={placing}
          className="w-fit rounded-full bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {placing ? "Placing order…" : `Place order · ${formatPaise(total)}`}
        </button>
      </form>

      <aside className="h-fit rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-3 text-lg font-medium">Order summary</h2>
        <ul className="flex flex-col gap-2">
          {rows.map(({ line, item }) => (
            <li key={line.itemId} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                <span className="text-zinc-500">× {line.quantity}</span>
              </span>
              <span className="shrink-0 tabular-nums">
                {formatPaise(item.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-zinc-200 pt-3 font-medium dark:border-zinc-800">
          <span>Total</span>
          <span className="tabular-nums">{formatPaise(total)}</span>
        </div>
        <Link
          href="/cart"
          className="mt-4 inline-block text-sm text-zinc-500 underline-offset-4 hover:underline"
        >
          ← Edit cart
        </Link>
      </aside>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>

      <AuthLoading>
        <p className="text-zinc-500">Loading…</p>
      </AuthLoading>

      <Unauthenticated>
        <p className="mb-4 text-zinc-500">
          Please sign in to complete your order.
        </p>
        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Sign in
        </Link>
      </Unauthenticated>

      <Authenticated>
        <CheckoutForm />
      </Authenticated>
    </main>
  );
}
