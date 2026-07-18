import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// The signed-in user's cart as plain { itemId, quantity } lines. Returns [] for
// signed-out visitors (they use the browser's guest cart instead). The client
// joins these with live item data, exactly like the guest cart, so the cart
// page/badge code is identical for both.
export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({ itemId: r.itemId, quantity: r.quantity }));
  },
});

async function requireUser(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Not signed in");
  return userId;
}

function findLine(ctx: MutationCtx, userId: Id<"users">, itemId: Id<"items">) {
  return ctx.db
    .query("cartItems")
    .withIndex("by_user_item", (q) =>
      q.eq("userId", userId).eq("itemId", itemId)
    )
    .unique();
}

// Add `addQty` of an item, clamped to available stock. Skips items that don't
// exist or are inactive. Shared by addItem and merge.
async function addQuantity(
  ctx: MutationCtx,
  userId: Id<"users">,
  itemId: Id<"items">,
  addQty: number
) {
  const item = await ctx.db.get(itemId);
  if (!item || !item.isActive) return;
  const qty = Math.max(1, Math.floor(addQty));
  const existing = await findLine(ctx, userId, itemId);
  const nextQty = Math.min((existing?.quantity ?? 0) + qty, item.stock);
  if (nextQty <= 0) return;
  if (existing) {
    await ctx.db.patch(existing._id, { quantity: nextQty });
  } else {
    await ctx.db.insert("cartItems", { userId, itemId, quantity: nextQty });
  }
}

export const addItem = mutation({
  args: { itemId: v.id("items"), quantity: v.optional(v.number()) },
  handler: async (ctx, { itemId, quantity }) => {
    const userId = await requireUser(ctx);
    await addQuantity(ctx, userId, itemId, quantity ?? 1);
  },
});

export const setQuantity = mutation({
  args: { itemId: v.id("items"), quantity: v.number() },
  handler: async (ctx, { itemId, quantity }) => {
    const userId = await requireUser(ctx);
    const existing = await findLine(ctx, userId, itemId);
    // Zero or below means remove the line.
    if (quantity <= 0) {
      if (existing) await ctx.db.delete(existing._id);
      return;
    }
    const item = await ctx.db.get(itemId);
    const capped = item
      ? Math.min(Math.floor(quantity), item.stock)
      : Math.floor(quantity);
    if (existing) {
      await ctx.db.patch(existing._id, { quantity: capped });
    } else if (item && item.isActive) {
      await ctx.db.insert("cartItems", { userId, itemId, quantity: capped });
    }
  },
});

export const removeItem = mutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, { itemId }) => {
    const userId = await requireUser(ctx);
    const existing = await findLine(ctx, userId, itemId);
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const rows = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    await Promise.all(rows.map((r) => ctx.db.delete(r._id)));
  },
});

// Fold a guest's localStorage cart into the server cart at login, so items
// added before signing in aren't lost. For an item that's in BOTH carts the
// result is the LARGER of the two quantities (not the sum) — so logging in
// never double-counts what you already had. Items only in one cart carry over
// as-is. All quantities are capped at stock.
export const merge = mutation({
  args: {
    lines: v.array(
      v.object({ itemId: v.id("items"), quantity: v.number() })
    ),
  },
  handler: async (ctx, { lines }) => {
    const userId = await requireUser(ctx);
    for (const line of lines) {
      const item = await ctx.db.get(line.itemId);
      if (!item || !item.isActive) continue;
      const guestQty = Math.max(1, Math.floor(line.quantity));
      const existing = await findLine(ctx, userId, line.itemId);
      const nextQty = Math.min(
        Math.max(existing?.quantity ?? 0, guestQty),
        item.stock
      );
      if (nextQty <= 0) continue;
      if (existing) {
        await ctx.db.patch(existing._id, { quantity: nextQty });
      } else {
        await ctx.db.insert("cartItems", {
          userId,
          itemId: line.itemId,
          quantity: nextQty,
        });
      }
    }
  },
});
