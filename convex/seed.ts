import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Dev-only helper, run manually via `npx convex run seed:devSeed
// '{"ownerEmail":"you@example.com"}'` — creates one event type + a Mon-Fri
// 09:00-17:00 weekly schedule for an already-signed-up team member, so the
// public booking flow can be tested end-to-end without hand-building data
// through a UI that doesn't exist until Phase 2.
export const devSeed = internalMutation({
  args: { ownerEmail: v.string() },
  handler: async (ctx, { ownerEmail }) => {
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", ownerEmail))
      .unique();
    if (owner === null) {
      throw new Error(
        `No user with email ${ownerEmail} — sign up at /signin and complete the profile form first`
      );
    }

    const existing = await ctx.db
      .query("eventTypes")
      .withIndex("by_slug", (q) => q.eq("slug", "intro-call"))
      .unique();
    if (existing !== null) {
      return { eventTypeId: existing._id, note: "already seeded" };
    }

    const eventTypeId = await ctx.db.insert("eventTypes", {
      ownerUserId: owner._id,
      name: "Intro Call",
      slug: "intro-call",
      description: "Chiamata conoscitiva di 30 minuti.",
      durationMinutes: 30,
      location: "google_meet",
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      minNoticeMinutes: 60,
      maxAdvanceDays: 30,
      active: true,
    });

    for (const weekday of [1, 2, 3, 4, 5]) {
      await ctx.db.insert("availabilityRules", {
        userId: owner._id,
        weekday,
        startMinute: 9 * 60,
        endMinute: 17 * 60,
      });
    }

    return { eventTypeId };
  },
});
