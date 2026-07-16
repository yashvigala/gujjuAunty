// Shared helpers for Convex functions. Plain functions in this file are NOT
// exposed as API endpoints — only exported query/mutation/action are.
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Server-side authorization gate for admin-only functions. Clients can hide
// buttons, but this is the check that actually protects the data.
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Not signed in");
  const user = await ctx.db.get(userId);
  if (user === null || !isAdminEmail(user.email)) {
    throw new ConvexError("Admin access required");
  }
  return user;
}

// Admins are configured by email so no signup flow can self-promote:
//   npx convex env set ADMIN_EMAILS "a@x.com,b@y.com"
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return admins.includes(email.toLowerCase());
}
