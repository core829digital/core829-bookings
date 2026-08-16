import { internalAction, internalMutation, query, type ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Resend } from "resend";
import { DateTime } from "luxon";
import { requireTeamUser } from "./authz";

const RETRY_DELAY_MS = 2 * 60_000;
const MAX_ATTEMPTS = 2;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&#34;")
    .replace(/'/g, "&#039;");
}

// Team-only audit view — surfaces silent send failures instead of leaving
// them buried in Convex function logs.
export const listRecentLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireTeamUser(ctx);
    return await ctx.db.query("emailLogs").withIndex("by_time").order("desc").take(100);
  },
});

export const logEmailAttempt = internalMutation({
  args: {
    bookingCancelToken: v.optional(v.string()),
    type: v.union(
      v.literal("confirmation"),
      v.literal("reminder"),
      v.literal("office_notification")
    ),
    recipient: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    error: v.optional(v.string()),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailLogs", { ...args, createdAt: Date.now() });
  },
});

// Shared send+log+retry path. A booking must never fail because an email
// failed — this always resolves, never throws, and self-heals with one
// retry before giving up and leaving a "failed" row in emailLogs for the
// dashboard to surface.
async function deliverEmail(
  ctx: ActionCtx,
  args: {
    type: "confirmation" | "reminder" | "office_notification";
    to: string;
    subject: string;
    html: string;
    cancelToken?: string;
    attempt: number;
    scheduleRetry: () => Promise<void>;
  }
) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.BOOKING_FROM_EMAIL ?? "CORE829 Bookings <onboarding@resend.dev>";

  if (!apiKey) {
    console.error(`[emails] RESEND_API_KEY not configured — skipping ${args.type}`);
    await ctx.runMutation(internal.emails.logEmailAttempt, {
      bookingCancelToken: args.cancelToken,
      type: args.type,
      recipient: args.to,
      status: "failed",
      error: "RESEND_API_KEY not configured",
      attempt: args.attempt,
    });
    return;
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    if (error) throw new Error(error.message ?? String(error));

    await ctx.runMutation(internal.emails.logEmailAttempt, {
      bookingCancelToken: args.cancelToken,
      type: args.type,
      recipient: args.to,
      status: "sent",
      attempt: args.attempt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[emails] ${args.type} failed (attempt ${args.attempt})`, message);
    await ctx.runMutation(internal.emails.logEmailAttempt, {
      bookingCancelToken: args.cancelToken,
      type: args.type,
      recipient: args.to,
      status: "failed",
      error: message,
      attempt: args.attempt,
    });
    if (args.attempt < MAX_ATTEMPTS) {
      await args.scheduleRetry();
    }
  }
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
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
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
    await deliverEmail(ctx, {
      type: "confirmation",
      to: args.inviteeEmail,
      subject: `Prenotazione confermata — ${args.eventTypeName}`,
      html,
      cancelToken: args.cancelToken,
      attempt,
      scheduleRetry: async () => {
        await ctx.scheduler.runAfter(RETRY_DELAY_MS, internal.emails.sendBookingConfirmation, {
          ...args,
          attempt: attempt + 1,
        });
      },
    });
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
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
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
    await deliverEmail(ctx, {
      type: "reminder",
      to: args.inviteeEmail,
      subject: `Promemoria — ${args.eventTypeName} ${label}`,
      html,
      attempt,
      scheduleRetry: async () => {
        await ctx.scheduler.runAfter(RETRY_DELAY_MS, internal.emails.sendBookingReminder, {
          ...args,
          attempt: attempt + 1,
        });
      },
    });
  },
});

// Notification sent to the office whenever a new booking is created. Callers
// already have the booking's fields in scope (they just inserted it), so
// this takes plain args directly rather than re-fetching — actions have no
// ctx.db, so a lookup would need a separate internalQuery round-trip anyway.
export const sendBookingNotificationToOffice = internalAction({
  args: {
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    eventTypeName: v.string(),
    service: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    cancelToken: v.string(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
    const to = process.env.BOOKING_NOTIFY_TO_EMAIL ?? "hello@core829.net";
    const when = DateTime.fromMillis(args.startTime).setZone(args.inviteeTimezone).toFormat(
      "cccc d MMMM yyyy, HH:mm"
    );
    const durationMinutes = Math.round((args.endTime - args.startTime) / 60_000);

    const html = `
      <p>È stata ricevuta una nuova prenotazione.</p>
      <table cellpadding="0" cellspacing="0" style="font-family:sans-serif;font-size:14px;color:#111">
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">A chi</td><td>${escapeHtml(args.inviteeName)} &lt;${escapeHtml(args.inviteeEmail)}&gt;</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Quando</td><td>${escapeHtml(when)} (${escapeHtml(args.inviteeTimezone)})</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Durata</td><td>${durationMinutes} min</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:600">Evento</td><td>${escapeHtml(args.eventTypeName)}</td></tr>
        ${args.service ? `<tr><td style="padding:4px 12px 4px 0;font-weight:600">Servizio richiesto</td><td>${escapeHtml(args.service)}</td></tr>` : ""}
      </table>
      <p><a href="https://bookings.core829.net/bookings/${args.cancelToken}">Visualizza prenotazione</a></p>
    `;

    await deliverEmail(ctx, {
      type: "office_notification",
      to,
      subject: `Nuova prenotazione — ${args.eventTypeName}`,
      html,
      cancelToken: args.cancelToken,
      attempt,
      scheduleRetry: async () => {
        await ctx.scheduler.runAfter(RETRY_DELAY_MS, internal.emails.sendBookingNotificationToOffice, {
          ...args,
          attempt: attempt + 1,
        });
      },
    });
  },
});
