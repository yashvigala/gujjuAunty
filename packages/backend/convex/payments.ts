import { action, internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// Razorpay talks in paise, which is exactly how we store prices — no
// conversion, no rounding.
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

// HMAC-SHA256 as lowercase hex, via Web Crypto (no Node runtime needed).
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Constant-time compare so a wrong signature can't be guessed byte-by-byte
// from response timing.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ── Internal helpers (not part of the public API) ───────────────────────────

export const loadOwnOrder = internalQuery({
  args: { orderId: v.id("orders"), userId: v.id("users") },
  handler: async (ctx, { orderId, userId }) => {
    const order = await ctx.db.get(orderId);
    if (!order || order.userId !== userId) return null;
    return order;
  },
});

export const attachRazorpayOrder = internalMutation({
  args: { orderId: v.id("orders"), razorpayOrderId: v.string() },
  handler: async (ctx, { orderId, razorpayOrderId }) => {
    await ctx.db.patch(orderId, { razorpayOrderId });
  },
});

export const markPaid = internalMutation({
  args: { orderId: v.id("orders"), razorpayPaymentId: v.string() },
  handler: async (ctx, { orderId, razorpayPaymentId }) => {
    await ctx.db.patch(orderId, { status: "paid", razorpayPaymentId });
  },
});

// ── Public actions ──────────────────────────────────────────────────────────

// Step 1 of payment: ask Razorpay to create a payment order for one of ours.
// This is an action (not a mutation) because it makes an outbound HTTP call.
export const createRazorpayOrder = action({
  args: { orderId: v.id("orders") },
  handler: async (
    ctx,
    { orderId }
  ): Promise<{ razorpayOrderId: string; amount: number; keyId: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in");

    const order = await ctx.runQuery(internal.payments.loadOwnOrder, {
      orderId,
      userId: userId as Id<"users">,
    });
    if (!order) throw new ConvexError("Order not found");
    if (order.status !== "pending_payment") {
      throw new ConvexError("This order has already been paid for");
    }

    const { keyId, keySecret } = credentials();

    const response = await fetch(RAZORPAY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Razorpay authenticates with HTTP Basic: keyId as user, secret as pass.
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: order.total, // already paise
        currency: "INR",
        receipt: orderId,
      }),
    });

    if (!response.ok) {
      // Never surface Razorpay's raw error body to the browser.
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

    await ctx.runMutation(internal.payments.attachRazorpayOrder, {
      orderId,
      razorpayOrderId,
    });

    // keyId is public — the browser needs it to open the checkout popup.
    return { razorpayOrderId, amount: order.total, keyId };
  },
});

// Step 2 of payment: the browser reports success, but we NEVER take its word
// for it. Razorpay signs `orderId|paymentId` with our secret; recomputing that
// signature is the only proof the payment is real.
export const verifyPayment = action({
  args: {
    orderId: v.id("orders"),
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<{ status: "paid" }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in");

    const order = await ctx.runQuery(internal.payments.loadOwnOrder, {
      orderId: args.orderId,
      userId: userId as Id<"users">,
    });
    if (!order) throw new ConvexError("Order not found");
    if (order.status === "paid") return { status: "paid" };

    // The signed order id must be the one we actually created for this order.
    if (order.razorpayOrderId !== args.razorpayOrderId) {
      throw new ConvexError("Payment verification failed");
    }

    const { keySecret } = credentials();
    const expected = await hmacSha256Hex(
      keySecret,
      `${args.razorpayOrderId}|${args.razorpayPaymentId}`
    );

    if (!safeEqual(expected, args.razorpaySignature)) {
      throw new ConvexError("Payment verification failed");
    }

    await ctx.runMutation(internal.payments.markPaid, {
      orderId: args.orderId,
      razorpayPaymentId: args.razorpayPaymentId,
    });

    return { status: "paid" };
  },
});
