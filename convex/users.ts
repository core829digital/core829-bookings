import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

// Completes the signed-in user's own profile (role + timezone) after
// Convex Auth creates their bare `users` row on sign-up. The first person
// ever to complete this becomes "owner"; everyone after defaults to
// "member" — an owner/admin can change roles later from the team UI.
// Self-serve signup is disabled at the Password-provider level, so team
// membership is still gated by who owns Convex Auth credentials.
export const seedProfile = mutation({
  args: {
    name: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const authUserId = await getAuthUserId(ctx);
    if (authUserId === null) throw new Error("Not authenticated");

    const caller = await ctx.db.get(authUserId);
    if (caller === null) throw new Error("User not found");
    if (caller.role !== undefined) return authUserId; // already completed

    const anyProfileComplete = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("role"), undefined))
      .first();
    const role = anyProfileComplete === null ? "owner" : "member";

    await ctx.db.patch(authUserId, { name: args.name, timezone: args.timezone, role });
    return authUserId;
  },
});
