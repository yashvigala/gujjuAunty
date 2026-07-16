import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Products sold on the store.
  // `price` is stored in paise (integer) — avoids float rounding bugs and is
  // exactly what Razorpay expects later.
  // `imageIds` are Convex storage file IDs; URLs are resolved in queries.
  items: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    price: v.number(),
    stock: v.number(),
    imageIds: v.array(v.id("_storage")),
    isActive: v.boolean(),
  }),
});
