import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Contact details are REQUIRED to place an order — you can't deliver snacks
// without a name, a number to call, and somewhere to send them. These same
// rules are reused by the profile page.
export function validateContact(contact: {
  name: string;
  phone: string;
  address: string;
}) {
  const name = contact.name.trim();
  const phone = contact.phone.trim();
  const address = contact.address.trim();

  if (name.length < 2) {
    throw new ConvexError("Please enter the name for this delivery");
  }
  // Indian mobile numbers: 10 digits starting 6-9, optional +91 prefix.
  if (!/^(\+91)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ""))) {
    throw new ConvexError(
      "Enter a valid 10-digit mobile number (e.g. 98765 43210)"
    );
  }
  if (address.length < 10) {
    throw new ConvexError(
      "Please enter a complete delivery address (at least 10 characters)"
    );
  }

  return { name, phone, address };
}

// Place an order from whatever is currently in the user's server cart.
// Everything happens in one mutation, which in Convex is a single atomic
// transaction — so stock can't be oversold by two simultaneous checkouts.
export const place = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in to check out");

    const contact = validateContact(args);

    const cartRows = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (cartRows.length === 0) throw new ConvexError("Your cart is empty");

    // Snapshot each line at current name/price, and re-check stock server-side
    // (the browser's idea of stock may be stale).
    const lines = [];
    for (const row of cartRows) {
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

    // This records an ATTEMPT to buy, nothing more. The cart is deliberately
    // left alone and stock is NOT deducted yet — none of that may happen until
    // payment is actually verified (see payments.markPaid). Otherwise closing
    // the payment window would empty someone's cart for an order they never
    // paid for.
    const orderId = await ctx.db.insert("orders", {
      userId,
      lines,
      total,
      contact,
      status: "pending_payment",
    });

    // Remember the details for next time, the way Blinkit/Zepto do. This is
    // safe to keep even if payment is abandoned — it's just their address.
    await ctx.db.patch(userId, contact);

    return orderId;
  },
});

// Called when the customer closes or fails the payment window. The attempt is
// marked cancelled so abandoned orders don't pile up as "awaiting payment".
// Deliberately refuses to touch an order that's already paid.
export const cancelPending = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return;
    const order = await ctx.db.get(orderId);
    if (!order || order.userId !== userId) return;
    if (order.status !== "pending_payment") return;
    await ctx.db.patch(orderId, { status: "cancelled" });
  },
});

// The signed-in customer's own orders, newest first — the whiteboard's
// "show orders" / "order history".
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// A single order, only readable by the customer who placed it.
export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, { orderId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const order = await ctx.db.get(orderId);
    if (!order || order.userId !== userId) return null;
    return order;
  },
});
