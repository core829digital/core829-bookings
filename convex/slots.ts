import { query } from "./_generated/server";
import { v } from "convex/values";
import {
  computeAvailableSlots,
  type AvailabilityWindow,
  type AvailabilityException,
} from "./lib/slotEngine";

// Shared by the first-party booking UI now, and by the public /v1 HTTP API
// once Phase 3 lands — keep all slot logic here, not duplicated per caller.
export const getAvailableSlots = query({
  args: {
    eventTypeSlug: v.string(),
    dateFrom: v.string(), // "YYYY-MM-DD", interpreted in `timezone`
    dateTo: v.string(),
    timezone: v.string(), // booker's IANA timezone
  },
  handler: async (ctx, args) => {
    const eventType = await ctx.db
      .query("eventTypes")
      .withIndex("by_slug", (q) => q.eq("slug", args.eventTypeSlug))
      .unique();
    if (eventType === null || !eventType.active) return [];

    const host = await ctx.db.get(eventType.ownerUserId);
    if (host === null || host.timezone === undefined) return [];

    const rules = await ctx.db
      .query("availabilityRules")
      .withIndex("by_user", (q) => q.eq("userId", host._id))
      .collect();
    const rulesByWeekday = new Map<number, AvailabilityWindow[]>();
    for (const rule of rules) {
      const list = rulesByWeekday.get(rule.weekday) ?? [];
      list.push({ startMinute: rule.startMinute, endMinute: rule.endMinute });
      rulesByWeekday.set(rule.weekday, list);
    }

    const exceptions = await ctx.db
      .query("availabilityExceptions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", host._id))
      .collect();
    const exceptionsByDate = new Map<string, AvailabilityException>();
    for (const exception of exceptions) {
      exceptionsByDate.set(exception.date, {
        type: exception.type,
        startMinute: exception.startMinute,
        endMinute: exception.endMinute,
      });
    }

    // Buffer the scan window generously so bookings that start/end near
    // the requested range's edges are still caught by the overlap check.
    const scanFrom = new Date(args.dateFrom + "T00:00:00Z").getTime() - 2 * 86_400_000;
    const scanTo = new Date(args.dateTo + "T00:00:00Z").getTime() + 2 * 86_400_000;
    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_host_and_time", (q) =>
        q.eq("hostUserId", host._id).gte("startTime", scanFrom).lte("startTime", scanTo)
      )
      .collect();
    const bookedIntervals = existingBookings
      .filter((b) => b.status === "confirmed")
      .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

    return computeAvailableSlots({
      hostTimezone: host.timezone,
      bookerTimezone: args.timezone,
      rangeFromDate: args.dateFrom,
      rangeToDate: args.dateTo,
      durationMinutes: eventType.durationMinutes,
      bufferBeforeMinutes: eventType.bufferBeforeMinutes,
      bufferAfterMinutes: eventType.bufferAfterMinutes,
      minNoticeMinutes: eventType.minNoticeMinutes,
      maxAdvanceDays: eventType.maxAdvanceDays,
      nowMs: Date.now(),
      rulesByWeekday,
      exceptionsByDate,
      bookedIntervals,
    });
  },
});
