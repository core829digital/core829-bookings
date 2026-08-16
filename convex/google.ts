import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireTeamUser } from "./authz";

// Whether the signed-in team member has connected Google Calendar — drives
// the connect/disconnect button in /team. No token exposed to the client.
export const myConnectionStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireTeamUser(ctx);
    return { connected: user.googleRefreshToken !== undefined };
  },
});

export const disconnect = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireTeamUser(ctx);
    await ctx.db.patch(user._id, {
      googleRefreshToken: undefined,
      googleCalendarConnectedAt: undefined,
    });
  },
});

// Exchanges the OAuth `code` Google redirected back with for a refresh
// token, and saves it on the calling (authenticated) user. Called from
// src/app/api/google/callback/route.ts, which forwards the caller's Convex
// Auth token — getAuthUserId works the same on an action's ctx.auth as it
// does on a query/mutation's, no extra plumbing needed.
export const exchangeCodeAndConnect = action({
  args: { code: v.string(), redirectUri: v.string() },
  handler: async (ctx, { code, redirectUri }): Promise<{ ok: boolean; error?: string }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { ok: false, error: "Google Calendar non configurato lato server" };
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.refresh_token) {
      console.error("[google] token exchange failed", data);
      return {
        ok: false,
        error:
          data.error === "invalid_grant"
            ? "Codice scaduto, riprova"
            : "Nessun refresh token ricevuto (riprova disconnettendo l'accesso da myaccount.google.com/permissions e ricollegando)",
      };
    }

    await ctx.runMutation(internal.google.saveRefreshToken, {
      userId,
      refreshToken: data.refresh_token,
    });
    return { ok: true };
  },
});

export const saveRefreshToken = internalMutation({
  args: { userId: v.id("users"), refreshToken: v.string() },
  handler: async (ctx, { userId, refreshToken }) => {
    await ctx.db.patch(userId, {
      googleRefreshToken: refreshToken,
      googleCalendarConnectedAt: Date.now(),
    });
  },
});

export const getUserGoogleAuth = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    return user?.googleRefreshToken ?? null;
  },
});

export const setBookingGoogleEventId = internalMutation({
  args: { bookingId: v.id("bookings"), googleEventId: v.optional(v.string()) },
  handler: async (ctx, { bookingId, googleEventId }) => {
    await ctx.db.patch(bookingId, { googleEventId });
  },
});

async function getAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("[google] access token refresh failed", await res.text());
    return null;
  }
  const data = await res.json();
  return data.access_token ?? null;
}

// Creates (or, if already synced, updates) the Google Calendar event for a
// booking on its host's calendar. Silently no-ops if the host hasn't
// connected Google Calendar — this must never block or fail a booking.
export const syncBookingToCalendar = internalAction({
  args: {
    bookingId: v.id("bookings"),
    hostUserId: v.id("users"),
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    eventTypeName: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    notes: v.optional(v.string()),
    existingGoogleEventId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const refreshToken = await ctx.runQuery(internal.google.getUserGoogleAuth, {
      userId: args.hostUserId,
    });
    if (!refreshToken) return;

    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return;

    const body = {
      summary: `${args.eventTypeName} — ${args.inviteeName}`,
      description: [
        `Prenotato tramite CORE829 Bookings.`,
        `Cliente: ${args.inviteeName} <${args.inviteeEmail}>`,
        args.notes ? `Note: ${args.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      start: { dateTime: new Date(args.startTime).toISOString() },
      end: { dateTime: new Date(args.endTime).toISOString() },
      attendees: [{ email: args.inviteeEmail, displayName: args.inviteeName }],
    };

    try {
      const url = args.existingGoogleEventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${args.existingGoogleEventId}`
        : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;
      const res = await fetch(url, {
        method: args.existingGoogleEventId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("[google] event sync failed", data);
        return;
      }
      if (!args.existingGoogleEventId) {
        await ctx.runMutation(internal.google.setBookingGoogleEventId, {
          bookingId: args.bookingId,
          googleEventId: data.id,
        });
      }
    } catch (err) {
      console.error("[google] event sync error", err);
    }
  },
});

export const deleteCalendarEvent = internalAction({
  args: { hostUserId: v.id("users"), googleEventId: v.string() },
  handler: async (ctx, { hostUserId, googleEventId }) => {
    const refreshToken = await ctx.runQuery(internal.google.getUserGoogleAuth, {
      userId: hostUserId,
    });
    if (!refreshToken) return;
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return;

    try {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (err) {
      console.error("[google] event delete error", err);
    }
  },
});
