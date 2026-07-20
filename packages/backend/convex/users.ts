import { action, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  getAuthUserId,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { isAdminEmail } from "./lib";
import { api } from "./_generated/api";

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

// Change your own password. Runs as an action because the auth helpers hash
// credentials (a CPU-bound crypto step) outside the transaction.
//
// The current password is REQUIRED and verified first: without that, anyone who
// got hold of an unlocked session could silently lock the real owner out.
export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { currentPassword, newPassword }): Promise<null> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not signed in");

    const me = await ctx.runQuery(api.users.me, {});
    if (!me?.email) throw new ConvexError("No email on this account");

    if (newPassword.length < 8) {
      throw new ConvexError("New password must be at least 8 characters");
    }
    if (newPassword === currentPassword) {
      throw new ConvexError("New password must be different from the current one");
    }

    // Verify the current password by re-authenticating against it.
    const existing = await retrieveAccount(ctx, {
      provider: "password",
      account: { id: me.email, secret: currentPassword },
    }).catch(() => null);
    if (!existing) {
      throw new ConvexError("Your current password is incorrect");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: me.email, secret: newPassword },
    });

    return null;
  },
});
