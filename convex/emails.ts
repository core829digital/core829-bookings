import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { DateTime } from "luxon";

// Mirrors the Resend pattern from core829-new-final's app/api/contact/route.ts:
// try/catch, manual escapeHtml, env-var-driven from/to, swallow-and-log on
// failure (a booking must not fail just because the confirmation email did).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

    const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";
    const manageUrl = `${siteUrl}/bookings/${args.cancelToken}`;

    const when = DateTime.fromMillis(args.startTime, { zone: args.inviteeTimezone }).toFormat(
      "cccc d MMMM yyyy, HH:mm"
    );

    const html = `
      <p>Ciao ${escapeHtml(args.inviteeName)},</p>
      <p>La tua prenotazione per <strong>${escapeHtml(args.eventTypeName)}</strong> è confermata.</p>
      <table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;color:#111">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Quando</td><td>${escapeHtml(when)} (${escapeHtml(args.inviteeTimezone)})</td></tr>
      </table>
      <p><a href="${manageUrl}">Gestisci o cancella la prenotazione</a></p>
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

    const when = DateTime.fromMillis(args.startTime, { zone: args.inviteeTimezone }).toFormat(
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
