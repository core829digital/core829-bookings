import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

// Self-serve signup is disabled — team accounts are seeded/invited by an
// owner (see convex/users.ts seed mutation), not created via this flow.
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
