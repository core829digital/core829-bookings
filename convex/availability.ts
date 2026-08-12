import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTeamUser } from "./authz";

// Public: the slot-computation query (convex/slots.ts) reads these directly
// via internal helpers; these two are for the team availability-editor UI.
export const listMyRules = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireTeamUser(ctx);
    return await ctx.db
      .query("availabilityRules")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const listMyExceptions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireTeamUser(ctx);
    return await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Replaces all weekly rules for the caller in one shot — simpler for a
// "weekly hours" editor UI than diffing individual rows.
export const setMyWeeklyRules = mutation({
  args: {
    rules: v.array(
      v.object({
        weekday: v.number(),
        startMinute: v.number(),
        endMinute: v.number(),
      })
    ),
  },
  handler: async (ctx, { rules }) => {
    const user = await requireTeamUser(ctx);
    const existing = await ctx.db
      .query("availabilityRules")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const rule of existing) {
      await ctx.db.delete(rule._id);
    }
    for (const rule of rules) {
      await ctx.db.insert("availabilityRules", { userId: user._id, ...rule });
    }
  },
});

export const setMyExceptionForDate = mutation({
  args: {
    date: v.string(),
    type: v.union(v.literal("unavailable"), v.literal("custom_hours")),
    startMinute: v.optional(v.number()),
    endMinute: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireTeamUser(ctx);
    const existing = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", user._id).eq("date", args.date)
      )
      .unique();
    if (existing !== null) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("availabilityExceptions", { userId: user._id, ...args });
    }
  },
});

export const removeMyExceptionForDate = mutation({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const user = await requireTeamUser(ctx);
    const existing = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", user._id).eq("date", date)
      )
      .unique();
    if (existing !== null) await ctx.db.delete(existing._id);
  },
});
