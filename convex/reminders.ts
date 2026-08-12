import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const REMINDER_WINDOWS: { label: string; minutesBefore: number }[] = [
  { label: "24h", minutesBefore: 24 * 60 },
  { label: "1h", minutesBefore: 60 },
];

// Bookings starting within the furthest reminder window that haven't
// started yet — the actual "is this reminder due" check happens per-window
// in sendDueReminders, this just narrows the scan via the index.
export const listUpcomingConfirmed = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const horizon = now + 25 * 60 * 60_000;
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_status_and_startTime", (q) =>
        q.eq("status", "confirmed").gt("startTime", now).lte("startTime", horizon)
      )
      .collect();

    return await Promise.all(
      bookings.map(async (booking) => {
        const eventType = await ctx.db.get(booking.eventTypeId);
        return { booking, eventTypeName: eventType?.name ?? "Appuntamento" };
      })
    );
  },
});

export const markReminderSent = internalMutation({
  args: { bookingId: v.id("bookings"), label: v.string() },
  handler: async (ctx, { bookingId, label }) => {
    const booking = await ctx.db.get(bookingId);
    if (booking === null || booking.remindersSent.includes(label)) return;
    await ctx.db.patch(bookingId, { remindersSent: [...booking.remindersSent, label] });
  },
});

// Run every 15 minutes by the cron in convex/crons.ts. Idempotent: each
// booking tracks which reminder labels it already sent, so a booking that
// crosses a window boundary between ticks fires exactly once per window.
export const sendDueReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const upcoming = await ctx.runQuery(internal.reminders.listUpcomingConfirmed, {});

    for (const { booking, eventTypeName } of upcoming) {
      for (const window of REMINDER_WINDOWS) {
        const dueAt = booking.startTime - window.minutesBefore * 60_000;
        const alreadySent = booking.remindersSent.includes(window.label);
        if (now >= dueAt && !alreadySent) {
          await ctx.runAction(internal.emails.sendBookingReminder, {
            inviteeName: booking.inviteeName,
            inviteeEmail: booking.inviteeEmail,
            inviteeTimezone: booking.inviteeTimezone,
            eventTypeName,
            startTime: booking.startTime,
            reminderLabel: window.label,
          });
          await ctx.runMutation(internal.reminders.markReminderSent, {
            bookingId: booking._id,
            label: window.label,
          });
        }
      }
    }
  },
});
