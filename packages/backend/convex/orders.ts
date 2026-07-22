import { query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Contact details are REQUIRED to place an order — you can't deliver snacks
// without a name, a number to call, and somewhere to send them. These same
// rules are reused by the profile page and the payment flow.
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

// NOTE: there is deliberately no "create order" mutation here. An order only
// ever comes into existence AFTER a verified payment — see
// payments.finalizeOrder → payments.createPaidOrder. Nothing is written to the
// database for an unpaid checkout, and there is no cash-on-delivery.

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
