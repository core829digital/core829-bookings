import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { requireTeamUser } from "./authz";

function generateCancelToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

// Overlap check re-run *inside* the mutation (not trusted from a slot list
// computed moments earlier) — Convex's OCC means two concurrent calls that
// both read the same booking window will conflict and one retries against
// fresh data, so exactly one can win a given slot.
async function assertNoOverlap(
  ctx: MutationCtx,
  hostUserId: Id<"users">,
  startTime: number,
  endTime: number,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
  excludeBookingId?: Id<"bookings">
) {
  const scanFrom = startTime - 24 * 60 * 60_000;
  const scanTo = endTime + 24 * 60 * 60_000;
  const candidates = await ctx.db
    .query("bookings")
    .withIndex("by_host_and_time", (q) =>
      q.eq("hostUserId", hostUserId).gte("startTime", scanFrom).lte("startTime", scanTo)
    )
    .collect();

  const bufferedStart = startTime - bufferBeforeMinutes * 60_000;
  const bufferedEnd = endTime + bufferAfterMinutes * 60_000;

  const conflict = candidates.some(
    (b) =>
      b.status === "confirmed" &&
      b._id !== excludeBookingId &&
      bufferedStart < b.endTime &&
      bufferedEnd > b.startTime
  );
  if (conflict) throw new Error("Slot no longer available");
}

function assertWithinPolicy(
  eventType: Doc<"eventTypes">,
  startTime: number,
  now: number
) {
  const earliestAllowedMs = now + eventType.minNoticeMinutes * 60_000;
  const latestAllowedMs = now + eventType.maxAdvanceDays * 24 * 60 * 60_000;
  if (startTime < earliestAllowedMs || startTime > latestAllowedMs) {
    throw new Error("Requested time is outside the allowed booking window");
  }
}

export const create = mutation({
  args: {
    eventTypeSlug: v.string(),
    startTime: v.number(),
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventType = await ctx.db
      .query("eventTypes")
      .withIndex("by_slug", (q) => q.eq("slug", args.eventTypeSlug))
      .unique();
    if (eventType === null || !eventType.active) {
      throw new Error("Event type not found");
    }

    const now = Date.now();
    assertWithinPolicy(eventType, args.startTime, now);

    const endTime = args.startTime + eventType.durationMinutes * 60_000;

    await assertNoOverlap(
      ctx,
      eventType.ownerUserId,
      args.startTime,
      endTime,
      eventType.bufferBeforeMinutes,
      eventType.bufferAfterMinutes
    );

    const cancelToken = generateCancelToken();

    const bookingId = await ctx.db.insert("bookings", {
      eventTypeId: eventType._id,
      hostUserId: eventType.ownerUserId,
      organizationId: eventType.organizationId,
      startTime: args.startTime,
      endTime,
      inviteeName: args.inviteeName,
      inviteeEmail: args.inviteeEmail,
      inviteeTimezone: args.inviteeTimezone,
      notes: args.notes,
      status: "confirmed",
      cancelToken,
      remindersSent: [],
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendBookingConfirmation, {
      inviteeName: args.inviteeName,
      inviteeEmail: args.inviteeEmail,
      inviteeTimezone: args.inviteeTimezone,
      eventTypeName: eventType.name,
      startTime: args.startTime,
      endTime,
      cancelToken,
    });
    await ctx.scheduler.runAfter(0, internal.emails.sendBookingNotificationToOffice, {
      inviteeName: args.inviteeName,
      inviteeEmail: args.inviteeEmail,
      inviteeTimezone: args.inviteeTimezone,
      eventTypeName: eventType.name,
      startTime: args.startTime,
      endTime,
      cancelToken,
    });
    // No-ops for internal CORE829 event types (eventType.organizationId is
    // undefined) — scheduleForBooking checks that itself. Bookings made on
    // a client's own hosted page (/o/[slug]) go through this same public
    // mutation, so they need this too, not just the API-key flow.
    await ctx.scheduler.runAfter(0, internal.webhooks.scheduleForBooking, {
      bookingId,
      event: "booking.created",
    });

    return { bookingId, cancelToken };
  },
});

export const getByCancelToken = query({
  args: { cancelToken: v.string() },
  handler: async (ctx, { cancelToken }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_cancelToken", (q) => q.eq("cancelToken", cancelToken))
      .unique();
    if (booking === null) return null;
    const eventType = await ctx.db.get(booking.eventTypeId);
    return { booking, eventType };
  },
});

export const cancel = mutation({
  args: { cancelToken: v.string() },
  handler: async (ctx, { cancelToken }) => {
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_cancelToken", (q) => q.eq("cancelToken", cancelToken))
      .unique();
    if (booking === null) throw new Error("Booking not found");
    if (booking.status !== "confirmed") throw new Error("Booking already cancelled");
    await ctx.db.patch(booking._id, { status: "cancelled" });
    await ctx.scheduler.runAfter(0, internal.webhooks.scheduleForBooking, {
      bookingId: booking._id,
      event: "booking.cancelled",
    });
  },
});

export const reschedule = mutation({
  args: { cancelToken: v.string(), newStartTime: v.number() },
  handler: async (ctx, { cancelToken, newStartTime }) => {
    const oldBooking = await ctx.db
      .query("bookings")
      .withIndex("by_cancelToken", (q) => q.eq("cancelToken", cancelToken))
      .unique();
    if (oldBooking === null) throw new Error("Booking not found");
    if (oldBooking.status !== "confirmed") throw new Error("Booking is not active");

    const eventType = await ctx.db.get(oldBooking.eventTypeId);
    if (eventType === null || !eventType.active) throw new Error("Event type not found");

    const now = Date.now();
    assertWithinPolicy(eventType, newStartTime, now);
    const newEndTime = newStartTime + eventType.durationMinutes * 60_000;

    await assertNoOverlap(
      ctx,
      oldBooking.hostUserId,
      newStartTime,
      newEndTime,
      eventType.bufferBeforeMinutes,
      eventType.bufferAfterMinutes,
      oldBooking._id
    );

    await ctx.db.patch(oldBooking._id, { status: "rescheduled" });

    const newCancelToken = generateCancelToken();
    const bookingId = await ctx.db.insert("bookings", {
      eventTypeId: oldBooking.eventTypeId,
      hostUserId: oldBooking.hostUserId,
      organizationId: oldBooking.organizationId,
      startTime: newStartTime,
      endTime: newEndTime,
      inviteeName: oldBooking.inviteeName,
      inviteeEmail: oldBooking.inviteeEmail,
      inviteeTimezone: oldBooking.inviteeTimezone,
      notes: oldBooking.notes,
      status: "confirmed",
      cancelToken: newCancelToken,
      rescheduledFromBookingId: oldBooking._id,
      remindersSent: [],
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendBookingConfirmation, {
      inviteeName: oldBooking.inviteeName,
      inviteeEmail: oldBooking.inviteeEmail,
      inviteeTimezone: oldBooking.inviteeTimezone,
      eventTypeName: eventType.name,
      startTime: newStartTime,
      endTime: newEndTime,
      cancelToken: newCancelToken,
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.scheduleForBooking, {
      bookingId,
      event: "booking.rescheduled",
    });

    return { bookingId, cancelToken: newCancelToken };
  },
});

// Team-only from here down.
export const listMineForRange = query({
  args: { fromTime: v.number(), toTime: v.number() },
  handler: async (ctx, { fromTime, toTime }) => {
    const user = await requireTeamUser(ctx);
    return await ctx.db
      .query("bookings")
      .withIndex("by_host_and_time", (q) =>
        q.eq("hostUserId", user._id).gte("startTime", fromTime).lte("startTime", toTime)
      )
      .collect();
  },
});

// A team member books directly on behalf of someone (phone call, walk-in,
// etc.) — same overlap/policy checks as the public flow, just skipping the
// invitee-facing slot picker.
export const createManual = mutation({
  args: {
    eventTypeId: v.id("eventTypes"),
    startTime: v.number(),
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireTeamUser(ctx);
    const eventType = await ctx.db.get(args.eventTypeId);
    if (eventType === null || eventType.ownerUserId !== user._id) {
      throw new Error("Event type not found");
    }

    const now = Date.now();
    const endTime = args.startTime + eventType.durationMinutes * 60_000;

    await assertNoOverlap(
      ctx,
      user._id,
      args.startTime,
      endTime,
      eventType.bufferBeforeMinutes,
      eventType.bufferAfterMinutes
    );

    const cancelToken = generateCancelToken();
    const bookingId = await ctx.db.insert("bookings", {
      eventTypeId: eventType._id,
      hostUserId: user._id,
      startTime: args.startTime,
      endTime,
      inviteeName: args.inviteeName,
      inviteeEmail: args.inviteeEmail,
      inviteeTimezone: args.inviteeTimezone,
      notes: args.notes,
      status: "confirmed",
      cancelToken,
      remindersSent: [],
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendBookingConfirmation, {
      inviteeName: args.inviteeName,
      inviteeEmail: args.inviteeEmail,
      inviteeTimezone: args.inviteeTimezone,
      eventTypeName: eventType.name,
      startTime: args.startTime,
      endTime,
      cancelToken,
    });

    return { bookingId, cancelToken };
  },
});

export const cancelAsHost = mutation({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const user = await requireTeamUser(ctx);
    const booking = await ctx.db.get(bookingId);
    if (booking === null || booking.hostUserId !== user._id) {
      throw new Error("Booking not found");
    }
    if (booking.status !== "confirmed") throw new Error("Booking already cancelled");
    await ctx.db.patch(bookingId, { status: "cancelled" });
  },
});
