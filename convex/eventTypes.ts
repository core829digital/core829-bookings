import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTeamUser } from "./authz";

const locationValidator = v.union(
  v.literal("google_meet"),
  v.literal("phone"),
  v.literal("in_person"),
  v.literal("custom")
);

// Public: only what the booking page needs to render a picker + slots.
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const eventType = await ctx.db
      .query("eventTypes")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (eventType === null || !eventType.active) return null;
    return eventType;
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("eventTypes").collect();
    return all.filter((e) => e.active && e.organizationId === undefined);
  },
});

// Public: an organization's hosted page (/o/[slug]) — only what's needed to
// render a list of bookable event types, no internal fields.
export const listByOrganizationSlug = query({
  args: { organizationSlug: v.string() },
  handler: async (ctx, { organizationSlug }) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", organizationSlug))
      .unique();
    if (org === null) return null;

    const all = await ctx.db.query("eventTypes").collect();
    const eventTypes = all
      .filter((e) => e.active && e.organizationId === org._id)
      .map((e) => ({
        slug: e.slug,
        name: e.name,
        description: e.description,
        durationMinutes: e.durationMinutes,
        location: e.location,
      }));
    return { organizationName: org.name, eventTypes };
  },
});

// Team-only from here down.
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireTeamUser(ctx);
    return await ctx.db
      .query("eventTypes")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    location: locationValidator,
    locationDetail: v.optional(v.string()),
    bufferBeforeMinutes: v.number(),
    bufferAfterMinutes: v.number(),
    minNoticeMinutes: v.number(),
    maxAdvanceDays: v.number(),
    // Leave unset for an internal CORE829 event type. Setting it publishes
    // the event type on that organization's hosted page (/o/[slug]) —
    // reserved to owner/admin since it's assigning work to a client account.
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, { organizationId, ...args }) => {
    const user = await requireTeamUser(ctx);

    if (organizationId !== undefined) {
      if (user.role !== "owner" && user.role !== "admin") {
        throw new Error("Only an owner/admin can assign an event type to an organization");
      }
      const org = await ctx.db.get(organizationId);
      if (org === null) throw new Error("Organization not found");
    }

    const existing = await ctx.db
      .query("eventTypes")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing !== null) throw new Error("Slug already in use");

    return await ctx.db.insert("eventTypes", {
      ...args,
      organizationId,
      ownerUserId: user._id,
      active: true,
    });
  },
});

export const update = mutation({
  args: {
    eventTypeId: v.id("eventTypes"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    location: v.optional(locationValidator),
    locationDetail: v.optional(v.string()),
    bufferBeforeMinutes: v.optional(v.number()),
    bufferAfterMinutes: v.optional(v.number()),
    minNoticeMinutes: v.optional(v.number()),
    maxAdvanceDays: v.optional(v.number()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, { eventTypeId, ...patch }) => {
    const user = await requireTeamUser(ctx);
    const eventType = await ctx.db.get(eventTypeId);
    if (eventType === null || eventType.ownerUserId !== user._id) {
      throw new Error("Event type not found");
    }
    await ctx.db.patch(eventTypeId, patch);
  },
});

export const remove = mutation({
  args: { eventTypeId: v.id("eventTypes") },
  handler: async (ctx, { eventTypeId }) => {
    const user = await requireTeamUser(ctx);
    const eventType = await ctx.db.get(eventTypeId);
    if (eventType === null || eventType.ownerUserId !== user._id) {
      throw new Error("Event type not found");
    }
    await ctx.db.delete(eventTypeId);
  },
});
