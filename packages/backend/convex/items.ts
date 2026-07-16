import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin } from "./lib";

// Resolve storage IDs into servable URLs so clients can render <img> tags.
async function withImageUrls(ctx: QueryCtx, item: Doc<"items">) {
  const urls = await Promise.all(
    item.imageIds.map((id) => ctx.storage.getUrl(id))
  );
  return { ...item, imageUrls: urls.filter((u): u is string => u !== null) };
}

// Field rules shared by create/update. Prices are integer paise — never
// floats, never rupees.
function validateName(name: string) {
  if (name.trim().length === 0) throw new ConvexError("Name is required");
}
function validatePrice(price: number) {
  if (!Number.isInteger(price) || price <= 0) {
    throw new ConvexError("Price must be a positive amount in paise");
  }
}
function validateStock(stock: number) {
  if (!Number.isInteger(stock) || stock < 0) {
    throw new ConvexError("Stock must be zero or a positive whole number");
  }
}

// ── Public (consumer storefront) ────────────────────────────────────────────

// Active items only.
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

// A single item (product detail page).
export const get = query({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    const item = await ctx.db.get(id);
    if (!item || !item.isActive) return null;
    return withImageUrls(ctx, item);
  },
});

// ── Admin (ecom-dashboard) ──────────────────────────────────────────────────

// Everything, including deactivated items.
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const items = await ctx.db.query("items").order("desc").collect();
    return Promise.all(items.map((item) => withImageUrls(ctx, item)));
  },
});

// Step 1 of an image upload: hand the browser a short-lived signed URL it can
// POST the file to. The resulting storageId is then saved on the item.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    stock: v.number(),
    imageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    validateName(args.name);
    validatePrice(args.price);
    validateStock(args.stock);
    return ctx.db.insert("items", {
      name: args.name.trim(),
      description: args.description,
      price: args.price,
      stock: args.stock,
      imageIds: args.imageIds,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("items"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    stock: v.optional(v.number()),
    imageIds: v.optional(v.array(v.id("_storage"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(args.id);
    if (!item) throw new ConvexError("Item not found");

    // Build the patch with only the provided keys — a key set to `undefined`
    // would DELETE that field in Convex, which is not what "not provided" means.
    const patch: Partial<Doc<"items">> = {};
    if (args.name !== undefined) {
      validateName(args.name);
      patch.name = args.name.trim();
    }
    if (args.description !== undefined) patch.description = args.description;
    if (args.price !== undefined) {
      validatePrice(args.price);
      patch.price = args.price;
    }
    if (args.stock !== undefined) {
      validateStock(args.stock);
      patch.stock = args.stock;
    }
    if (args.imageIds !== undefined) {
      // Delete storage files that are no longer referenced by this item.
      const kept = new Set(args.imageIds);
      const removed = item.imageIds.filter((id) => !kept.has(id));
      await Promise.all(removed.map((id) => ctx.storage.delete(id)));
      patch.imageIds = args.imageIds;
    }
    if (args.isActive !== undefined) patch.isActive = args.isActive;

    await ctx.db.patch(args.id, patch);
  },
});

// Hard delete (also removes the stored images). Fine while items aren't
// referenced elsewhere; once orders land, prefer deactivating instead —
// the dashboard offers both.
export const remove = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, { id }) => {
    await requireAdmin(ctx);
    const item = await ctx.db.get(id);
    if (!item) return;
    await Promise.all(item.imageIds.map((imageId) => ctx.storage.delete(imageId)));
    await ctx.db.delete(id);
  },
});
