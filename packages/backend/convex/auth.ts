import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import type { Value } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      // `params` is untrusted client input (Record<string, unknown-ish>),
      // so we validate at the boundary instead of casting blindly.
      profile(params) {
        const email = typeof params.email === "string" ? params.email.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ConvexError("Please enter a valid email address");
        }
        // Convex `Value` has no `undefined` — when there is no name the key
        // must be absent from the returned doc, not set to undefined.
        const profile: Record<string, Value> & { email: string } = { email };
        if (typeof params.name === "string" && params.name.trim().length > 0) {
          profile.name = params.name.trim();
        }
        return profile;
      },
    }),
  ],
});
