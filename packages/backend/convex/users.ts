import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { isAdminEmail } from "./lib";

// The signed-in user, or null. `isAdmin` drives the dashboard gate — it is
// computed server-side so the client can't fake it.
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (user === null) return null;
    return { ...user, isAdmin: isAdminEmail(user.email) };
  },
});
