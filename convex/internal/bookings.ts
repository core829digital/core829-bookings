import { internalMutation, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Internal, org-scoped booking operations used ONLY by the /v1 HTTP routes
// (convex/http.ts). The caller passes `organizationId` derived from a
// validated API key — never from client input. Every read/write here filters
// strictly by that org, which is the multi-tenant isolation invariant the
// convex-authz pre-Phase-3 audit is meant to verify.

function generateCancelToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

async function assertNoOverlap(
  ctx: MutationCtx,
  hostUserId: Id<"users">,
  startTime: number,
  endTime: number,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number
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
      bufferedStart < b.endTime &&
      bufferedEnd > b.startTime
  );
  if (conflict) throw new Error("Slot no longer available");
}

// Public event types an external site can book (internal CORE829 types).
export const listEventTypesForApi = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("eventTypes").collect();
    return all
      .filter((e) => e.active && e.organizationId === undefined)
      .map((e) => ({
        id: e._id,
        slug: e.slug,
        name: e.name,
        durationMinutes: e.durationMinutes,
        description: e.description,
        location: e.location,
        bufferBeforeMinutes: e.bufferBeforeMinutes,
        bufferAfterMinutes: e.bufferAfterMinutes,
      }));
  },
});

export const createForOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
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
    if (eventType === null || !eventType.active) throw new Error("Event type not found");

    const now = Date.now();
    const earliestAllowedMs = now + eventType.minNoticeMinutes * 60_000;
    const latestAllowedMs = now + eventType.maxAdvanceDays * 24 * 60 * 60_000;
    if (args.startTime < earliestAllowedMs || args.startTime > latestAllowedMs) {
      throw new Error("Requested time is outside the allowed booking window");
    }

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
      organizationId: args.organizationId,
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
    await ctx.scheduler.runAfter(0, internal.webhooks.scheduleForBooking, {
      bookingId,
      event: "booking.created",
    });

    return { bookingId, startTime: args.startTime, endTime, cancelToken };
  },
});

export const getById = internalQuery({
  args: { bookingId: v.id("bookings"), organizationId: v.id("organizations") },
  handler: async (ctx, { bookingId, organizationId }) => {
    const booking = await ctx.db.get(bookingId);
    if (booking === null || booking.organizationId !== organizationId) return null;
    const eventType = await ctx.db.get(booking.eventTypeId);
    const org = await ctx.db.get(organizationId);
    return {
      id: booking._id,
      eventTypeSlug: eventType?.slug ?? null,
      eventTypeName: eventType?.name ?? null,
      organization: org?.name ?? null,
      startTime: booking.startTime,
      endTime: booking.endTime,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeTimezone: booking.inviteeTimezone,
      notes: booking.notes,
      status: booking.status,
      createdAt: booking.createdAt,
    };
  },
});

export const cancelForOrganization = internalMutation({
  args: { bookingId: v.id("bookings"), organizationId: v.id("organizations") },
  handler: async (ctx, { bookingId, organizationId }) => {
    const booking = await ctx.db.get(bookingId);
    if (booking === null || booking.organizationId !== organizationId) {
      throw new Error("Booking not found");
    }
    if (booking.status !== "confirmed") throw new Error("Booking is not active");
    await ctx.db.patch(bookingId, { status: "cancelled" });
    await ctx.scheduler.runAfter(0, internal.webhooks.scheduleForBooking, {
      bookingId,
      event: "booking.cancelled",
    });
    return { id: bookingId, status: "cancelled" };
  },
});

export const rescheduleForOrganization = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    organizationId: v.id("organizations"),
    newStartTime: v.number(),
  },
  handler: async (ctx, { bookingId, organizationId, newStartTime }) => {
    const oldBooking = await ctx.db.get(bookingId);
    if (oldBooking === null || oldBooking.organizationId !== organizationId) {
      throw new Error("Booking not found");
    }
    if (oldBooking.status !== "confirmed") throw new Error("Booking is not active");

    const eventType = await ctx.db.get(oldBooking.eventTypeId);
    if (eventType === null || !eventType.active) throw new Error("Event type not found");

    const now = Date.now();
    const earliestAllowedMs = now + eventType.minNoticeMinutes * 60_000;
    if (newStartTime < earliestAllowedMs) {
      throw new Error("Requested time is outside the allowed booking window");
    }

    const newEndTime = newStartTime + eventType.durationMinutes * 60_000;
    await assertNoOverlap(
      ctx,
      oldBooking.hostUserId,
      newStartTime,
      newEndTime,
      eventType.bufferBeforeMinutes,
      eventType.bufferAfterMinutes
    );

    await ctx.db.patch(oldBooking._id, { status: "rescheduled" });
    const newCancelToken = generateCancelToken();
    const newBookingId = await ctx.db.insert("bookings", {
      eventTypeId: oldBooking.eventTypeId,
      hostUserId: oldBooking.hostUserId,
      organizationId,
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
      bookingId: newBookingId,
      event: "booking.rescheduled",
    });

    return { bookingId: newBookingId, startTime: newStartTime, endTime: newEndTime };
  },
});