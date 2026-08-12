import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

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

    return { bookingId, cancelToken: newCancelToken };
  },
});
