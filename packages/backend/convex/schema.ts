import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // Tables Convex Auth needs to function (authAccounts, authSessions, ...).
  ...authTables,

  // Whiteboard: "user info" → name / email / address / phone no.
  // This REPLACES the default authTables.users definition, so it must keep
  // every field Convex Auth manages (all optional, auth writes them) and the
  // "email" index Convex Auth looks users up by.
  users: defineTable({
    // managed by Convex Auth
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // GujjuAunty profile fields
    address: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

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

  // A signed-in user's shopping cart — one row per item. Living in the DB (not
  // the browser) is what lets the cart follow the account across devices and
  // browsers, and update in real time. Guests use a localStorage cart instead
  // (merged in here on login).
  cartItems: defineTable({
    userId: v.id("users"),
    itemId: v.id("items"),
    quantity: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_item", ["userId", "itemId"]),
});
