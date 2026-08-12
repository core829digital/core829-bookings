import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { DateTime } from "luxon";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

export const sendBookingConfirmation = internalAction({
  args: {
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    eventTypeName: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    cancelToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[bookings] RESEND_API_KEY is not configured — skipping email");
      return;
    }

    const resend = new Resend(apiKey);
    const from = process.env.BOOKING_FROM_EMAIL ?? "CORE829 Bookings <onboarding@resend.dev>";
    const to = args.inviteeEmail;

    const when = DateTime.fromMillis(args.startTime).setZone(args.inviteeTimezone).toFormat(
      "cccc d MMMM yyyy, HH:mm"
    );

    const html = `
      <p>Ciao ${escapeHtml(args.inviteeName)},</p>
      <p>La tua prenotazione per <strong>${escapeHtml(args.eventTypeName)}</strong> è confermata.</p>
      <table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;color:#111">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Quando</td><td>${escapeHtml(when)} (${escapeHtml(args.inviteeTimezone)})</td></tr>
      </table>
      <p><a href="https://bookings.core829.net/bookings/${args.cancelToken}">Gestisci o cancella la prenotazione</a></p>
    `;

    try {
      const { error } = await resend.emails.send({
        from,
        to,
        subject: `Prenotazione confermata — ${args.eventTypeName}`,
        html,
      });
      if (error) {
        console.error("[bookings] Resend error", error);
      }
    } catch (err) {
      console.error("[bookings] Unexpected email error", err);
    }
  },
});

export const sendBookingReminder = internalAction({
  args: {
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    eventTypeName: v.string(),
    startTime: v.number(),
    reminderLabel: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[bookings] RESEND_API_KEY is not configured — skipping reminder");
      return;
    }

    const resend = new Resend(apiKey);
    const from = process.env.BOOKING_FROM_EMAIL ?? "CORE829 Bookings <onboarding@resend.dev>";

    const when = DateTime.fromMillis(args.startTime).setZone(args.inviteeTimezone).toFormat(
      "cccc d MMMM yyyy, HH:mm"
    );
    const label = args.reminderLabel === "24h" ? "tra 24 ore" : "tra 1 ora";

    const html = `
      <p>Ciao ${escapeHtml(args.inviteeName)},</p>
      <p>Promemoria: il tuo appuntamento <strong>${escapeHtml(args.eventTypeName)}</strong> è ${label}.</p>
      <table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;color:#111">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Quando</td><td>${escapeHtml(when)} (${escapeHtml(args.inviteeTimezone)})</td></tr>
      </table>
    `;

    try {
      const { error } = await resend.emails.send({
        from,
        to: args.inviteeEmail,
        subject: `Promemoria — ${args.eventTypeName} ${label}`,
        html,
      });
      if (error) {
        console.error("[bookings] Resend error", error);
      }
    } catch (err) {
      console.error("[bookings] Unexpected email error", err);
    }
  },
});

// NEW: Notification sent to admin/office when a new booking is created
export const sendBookingNotificationToOffice = internalAction({
  args: {
    bookingId: v.id("bookings"),
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    eventTypeName: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    cancelToken: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("[bookings] RESEND_API_KEY is not configured — skipping office notification");
      return;
    }

    const resend = new Resend(apiKey);
    const from = process.env.BOOKING_FROM_EMAIL ?? "CORE829 Bookings <onboarding@resend.dev>";

    const when = DateTime.fromMillis(args.startTime).setZone(args.inviteeTimezone).toFormat(
      "cccc d MMMM yyyy, HH:mm"
    );

    const html = `
      <p>È stata ricevuta una nuova prenotazione.</p>
      <table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;color:#111">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">A chi</td><td>${escapeHtml(args.inviteeName)} <${escapeHtml(args.inviteeEmail)}></td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Quando</td><td>${escapeHtml(when)} (${escapeHtml(args.inviteeTimezone)})</td></tr>
        <t r><td style="padding:4px 12px 4px 0;font-weight:600">Durata</td><td>${escapeHtml(String(args.endTime - args.startTime))} min</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Servizio</td><td>${escapeHtml(args.eventTypeName)}</td></tr>
      </table>
      <p><a href="https://bookings.core829.net/bookings/${args.cancelToken}">Visualizza prenotazione</a></p>
    `;

    const to = ["office@core829.net", "contact.core829@gmail.com"];

    try {
      const { error } = await resend.emails.send({
        from,
        to,
        subject: `Nuova prenotazione — ${args.eventTypeName}`,
        html,
      });
      if (error) {
        console.error("[bookings] Resend error office notification", error);
      }
    } catch (err) {
      console.error("[bookings] Unexpected email error office notification", err);
    }
  },
});

// Helper: invia notifica office al momento della creazione booking
export const notifyOfficeOnNewBooking = internalAction({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    // @ts-expect-error - ctx.db is available at runtime in Convex actions
    const booking = await ctx.db.get(bookingId);
    if (booking === null) return;

    // @ts-expect-error - ctx.runAction type signature differs at build time
    await ctx.runAction(sendBookingNotificationToOffice, {
      bookingId: booking._id,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeTimezone: booking.inviteeTimezone,
      durationMin: String(booking.endTime - booking.startTime),
      cancelToken: booking.cancelToken,
    });
    return { success: true };
  },
});