import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { validateContact } from "./orders";

// Razorpay talks in paise, which is exactly how we store prices — no conversion.
const RAZORPAY_API = "https://api.razorpay.com/v1/orders";

function credentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new ConvexError(
      "Payments are not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
    );
  }
  return { keyId, keySecret };
}

function authHeader(keyId: string, keySecret: string): string {
  // Razorpay authenticates with HTTP Basic: keyId as user, secret as password.
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

// Read the user's cart and turn it into order lines, validating every item is
// still available and in stock. Shared by the "get amount" query and the
// "create the order" mutation so the two can never disagree on the maths.
async function snapshotCart(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("cartItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (rows.length === 0) throw new ConvexError("Your cart is empty");

  const lines = [];
  for (const row of rows) {
    const item = await ctx.db.get(row.itemId);
    if (!item || !item.isActive) {
      throw new ConvexError(
        "An item in your cart is no longer available — please review your cart"
      );
    }
    if (row.quantity > item.stock) {
      throw new ConvexError(
        `Only ${item.stock} × ${item.name} left in stock — please update your cart`
      );
    }
    lines.push({
      itemId: item._id,
      name: item.name,
      price: item.price,
      quantity: row.quantity,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return { rows, lines, total };
}

// ── Internal helpers (never callable from a browser) ────────────────────────

// Amount to charge for the current cart. Throws if the cart can't be ordered.
export const cartTotal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { total } = await snapshotCart(ctx, userId);
    return total;
  },
});

// Has an order already been created for this Razorpay order? Used to make order
// creation idempotent — a success callback AND a reconcile can both fire, but
// only one order must ever result.
export const orderByRazorpay = internalQuery({
  args: { razorpayOrderId: v.string() },
  handler: async (ctx, { razorpayOrderId }) => {
    return ctx.db
      .query("orders")
      .withIndex("by_razorpay_order", (q) =>
        q.eq("razorpayOrderId", razorpayOrderId)
      )
      .unique();
  },
});

// THE moment an order comes into existence — and only ever after a verified
// payment. Rebuilds the order from the cart, checks the total matches what was
// actually charged, then records it, deducts stock and empties the cart, all in
// one transaction. Idempotent on razorpayOrderId.
export const createPaidOrder = internalMutation({
  args: {
    userId: v.id("users"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    paidAmount: v.number(),
    contact: v.object({
      name: v.string(),
      phone: v.string(),
      address: v.string(),
    }),
  },
  handler: async (ctx, args): Promise<Id<"orders">> => {
    // Already created (e.g. success + reconcile raced) — return the existing one.
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_razorpay_order", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId)
      )
      .unique();
    if (existing) return existing._id;

    const { rows, lines, total } = await snapshotCart(ctx, args.userId);

    // The cart must still be worth exactly what Razorpay charged. If the
    // customer changed it mid-payment, refuse rather than record a wrong order.
    if (total !== args.paidAmount) {
      throw new ConvexError(
        "Your cart changed during payment — please contact support to resolve this order"
      );
    }

    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      lines,
      total,
      contact: args.contact,
      status: "paid",
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
    });

    // Deduct the stock that was just sold.
    for (const line of lines) {
      const item = await ctx.db.get(line.itemId);
      if (item) {
        await ctx.db.patch(line.itemId, {
          stock: Math.max(0, item.stock - line.quantity),
        });
      }
    }

    // Empty the cart — these items are bought and paid for now.
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    // Remember the delivery details for next time.
    await ctx.db.patch(args.userId, args.contact);

    return orderId;
  },
});

// Ops helper: what did Razorpay record against a payment order? CLI-only.
export const inspectRazorpayOrder = internalAction({
  args: { razorpayOrderId: v.string() },
  handler: async (_ctx, { razorpayOrderId }): Promise<string> => {
    const { keyId, keySecret } = credentials();
    const response = await fetch(`${RAZORPAY_API}/${razorpayOrderId}/payments`, {
      headers: { Authorization: authHeader(keyId, keySecret) },
    });
    if (!response.ok) return `ERROR ${response.status}`;
    const data: unknown = await response.json();
    const items =
      typeof data === "object" && data !== null && "items" in data
        ? (data as { items: unknown }).items
        : [];
    if (!Array.isArray(items) || items.length === 0) return "no payments";
    return items
      .map((p) => {
        const rec = p as { id?: unknown; status?: unknown; method?: unknown };
        return `${String(rec.id)} status=${String(rec.status)} method=${String(rec.method)}`;
      })
      .join("; ");
  },
});

// Look up a captured/authorized payment on a Razorpay order, and the notes we
// stamped it with. Returns null when nothing was actually paid.
async function fetchPaidPayment(
  keyId: string,
  keySecret: string,
  razorpayOrderId: string
): Promise<{ paymentId: string; amount: number; notesUserId: string } | null> {
  const headers = { Authorization: authHeader(keyId, keySecret) };

  const orderRes = await fetch(`${RAZORPAY_API}/${razorpayOrderId}`, { headers });
  if (!orderRes.ok) {
    throw new ConvexError("Could not confirm your payment — please try again");
  }
  const orderData = (await orderRes.json()) as {
    amount?: unknown;
    notes?: { userId?: unknown };
  };

  const payRes = await fetch(`${RAZORPAY_API}/${razorpayOrderId}/payments`, {
    headers,
  });
  if (!payRes.ok) {
    throw new ConvexError("Could not confirm your payment — please try again");
  }
  const payData = (await payRes.json()) as { items?: unknown };
  const items = Array.isArray(payData.items) ? payData.items : [];

  const paid = items.find(
    (p): p is { id: string; status: string } =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as { id?: unknown }).id === "string" &&
      ((p as { status?: unknown }).status === "captured" ||
        (p as { status?: unknown }).status === "authorized")
  );
  if (!paid) return null;

  return {
    paymentId: paid.id,
    amount: typeof orderData.amount === "number" ? orderData.amount : -1,
    notesUserId:
      typeof orderData.notes?.userId === "string" ? orderData.notes.userId : "",
  };
}

// ── Public actions ──────────────────────────────────────────────────────────

// Step 1: begin checkout. Validates the cart and contact, then asks Razorpay to
// create a payment order for the exact cart total. Crucially, NOTHING is written
// to our database here — no order exists until the money is confirmed.
export const createRazorpayOrder = action({
  args: { name: v.string(), phone: v.string(), address: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ razorpayOrderId: string; amount: number; keyId: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in to check out");
    validateContact(args);

    const amount = await ctx.runQuery(internal.payments.cartTotal, {
      userId: userId as Id<"users">,
    });

    const { keyId, keySecret } = credentials();
    const response = await fetch(RAZORPAY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(keyId, keySecret),
      },
      body: JSON.stringify({
        amount,
        currency: "INR",
        // Stamp the buyer so we can prove ownership when we confirm later.
        notes: { userId },
      }),
    });

    if (!response.ok) {
      console.error("Razorpay order creation failed", await response.text());
      throw new ConvexError("Could not start payment — please try again");
    }

    const data: unknown = await response.json();
    const razorpayOrderId =
      typeof data === "object" && data !== null && "id" in data
        ? (data as { id: unknown }).id
        : undefined;
    if (typeof razorpayOrderId !== "string") {
      throw new ConvexError("Could not start payment — please try again");
    }

    // keyId is public — the browser needs it to open the checkout popup.
    return { razorpayOrderId, amount, keyId };
  },
});

// Step 2: finish checkout. Called on BOTH payment success and popup-close — we
// never trust the browser's word, we ask Razorpay directly whether this order
// was actually paid. Only if it was do we create the order. If not, nothing is
// recorded and the cart is left untouched.
export const finalizeOrder = action({
  args: {
    razorpayOrderId: v.string(),
    name: v.string(),
    phone: v.string(),
    address: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ paid: boolean; orderId: Id<"orders"> | null }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in");

    // Already finalized (idempotent) — hand back the existing order.
    const existing = await ctx.runQuery(internal.payments.orderByRazorpay, {
      razorpayOrderId: args.razorpayOrderId,
    });
    if (existing && existing.userId === userId) {
      return { paid: true, orderId: existing._id };
    }

    const { keyId, keySecret } = credentials();
    const payment = await fetchPaidPayment(keyId, keySecret, args.razorpayOrderId);

    // No captured payment → the customer didn't pay. Record nothing.
    if (!payment) return { paid: false, orderId: null };

    // The payment order must be the one we created for THIS user.
    if (payment.notesUserId !== userId) {
      throw new ConvexError("Payment verification failed");
    }

    const contact = validateContact(args);
    const orderId = await ctx.runMutation(internal.payments.createPaidOrder, {
      userId: userId as Id<"users">,
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: payment.paymentId,
      paidAmount: payment.amount,
      contact,
    });

    return { paid: true, orderId };
  },
});
