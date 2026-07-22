import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// The stages an admin can move an order through, and what each one may become
// next. It is FORWARD-ONLY: once an order exists it has already been paid for,
// and there is no cancellation here — cancelling a paid order would mean
// refunding money, which is a separate flow we don't offer. So fulfilment only
// ever advances.
const NEXT_STATUS: Record<string, string[]> = {
  paid: ["processing"],
  processing: ["shipped"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
};

// Admin view of a single order = the order itself plus the customer it belongs
// to, so the dashboard can show "which customer" (the whiteboard requirement)
// without the frontend making a second lookup.
async function withCustomer(ctx: QueryCtx, order: Doc<"orders">) {
  const user = await ctx.db.get(order.userId);
  return {
    ...order,
    customer: user
      ? { name: user.name, email: user.email, phone: user.phone }
      : null,
    nextStatuses: NEXT_STATUS[order.status] ?? [],
  };
}

// Every order in the shop, newest first. Admin-only.
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const orders = await ctx.db.query("orders").order("desc").collect();
    return Promise.all(orders.map((order) => withCustomer(ctx, order)));
  },
});

// Advance an order to its next fulfilment stage, only along an allowed path.
export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("out_for_delivery"),
      v.literal("delivered")
    ),
  },
  handler: async (ctx, { orderId, status }) => {
    await requireAdmin(ctx);
    const order = await ctx.db.get(orderId);
    if (!order) throw new ConvexError("Order not found");

    const allowed = NEXT_STATUS[order.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ConvexError(
        `Can't move an order from "${order.status}" to "${status}"`
      );
    }

    await ctx.db.patch(orderId, { status });
  },
});
