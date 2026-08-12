import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

// Every team-only query/mutation must call this — never trust a
// client-supplied userId for authorization decisions.
export async function requireTeamUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (user === null || user.role === undefined) {
    throw new Error("Not authenticated");
  }
  return user;
}
