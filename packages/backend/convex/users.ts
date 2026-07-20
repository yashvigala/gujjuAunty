import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
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

// Trim a form value; blank means "clear this field". Convex deletes a field
// when it's patched with undefined, which is exactly the behaviour we want.
function clean(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Update the signed-in user's own profile. The profile form always submits all
// three fields, so this is a full replace: whatever is blank gets cleared.
// Note there is deliberately no userId argument — you can only edit yourself.
export const updateProfile = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in");

    const name = clean(args.name);
    const phone = clean(args.phone);
    const address = clean(args.address);

    if (phone !== undefined) {
      // Indian mobile numbers: 10 digits starting 6-9, optional +91 prefix.
      const digits = phone.replace(/[\s-]/g, "");
      if (!/^(\+91)?[6-9]\d{9}$/.test(digits)) {
        throw new ConvexError(
          "Enter a valid 10-digit mobile number (e.g. 98765 43210)"
        );
      }
    }

    if (address !== undefined && address.length < 10) {
      throw new ConvexError(
        "Please enter a complete delivery address (at least 10 characters)"
      );
    }

    await ctx.db.patch(userId, { name, phone, address });
  },
});
