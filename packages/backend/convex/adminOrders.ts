import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireAdmin } from "./lib";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// The stages an admin can move an order through, and what each one may become
// next. Encoding the allowed transitions here (rather than letting any status
// jump to any other) prevents nonsense like marking a cancelled order
// "delivered", or shipping something that was never paid for.
const NEXT_STATUS: Record<string, string[]> = {
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
  pending_payment: ["cancelled"], // an unpaid order can only be abandoned
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

// Move an order to a new status, but only along an allowed path.
export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("out_for_delivery"),
      v.literal("delivered"),
      v.literal("cancelled")
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

    // Cancelling a paid order puts the stock back — those items are for sale
    // again. (Payment refunds are a separate, out-of-scope concern.)
    if (status === "cancelled" && order.status !== "pending_payment") {
      for (const line of order.lines) {
        const item = await ctx.db.get(line.itemId);
        if (item) {
          await ctx.db.patch(line.itemId, {
            stock: item.stock + line.quantity,
          });
        }
      }
    }

    await ctx.db.patch(orderId, { status });
  },
});
