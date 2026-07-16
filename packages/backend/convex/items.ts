import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Resolve storage IDs into servable URLs so clients can render <img> tags.
async function withImageUrls(ctx: QueryCtx, item: Doc<"items">) {
  const urls = await Promise.all(
    item.imageIds.map((id) => ctx.storage.getUrl(id))
  );
  return { ...item, imageUrls: urls.filter((u): u is string => u !== null) };
}

// Public: active items for the consumer storefront.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("items")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return Promise.all(items.map((item) => withImageUrls(ctx, item)));
  },
});

// Public: a single item (used by the product detail page).
export const get = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item || !item.isActive) return null;
    return withImageUrls(ctx, item);
  },
});
