import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTeamUser } from "./authz";

export const WEBHOOK_EVENTS = [
  "booking.created",
  "booking.rescheduled",
  "booking.cancelled",
] as const;

const webhookEvent = v.union(
  v.literal("booking.created"),
  v.literal("booking.rescheduled"),
  v.literal("booking.cancelled")
);

const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 86_400_000]; // 1m → 5m → 30m → 2h → 24h
const MAX_ATTEMPTS = 5;

// Stripe's exact signing scheme: `t=<ts>,v1=<hex hmac-sha256(secret, ts.payload)>`.
async function signPayload(secret: string, timestamp: number, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`)
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${hex}`;
}

// Canonical JSON bytes → string that was signed. Consumers must hash the
// exact same bytes; JSON.stringify is deterministic enough for the objects
// we produce (flat, no undefined values after Convex serialization).
function canonicalJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

// Creates one webhookDelivery per active endpoint of the booking's org, then
// hands each to `deliver`. Runs off the booking mutation's critical path via
// ctx.scheduler.runAfter(0, ...).
export const scheduleForBooking = internalAction({
  args: {
    bookingId: v.id("bookings"),
    event: webhookEvent,
  },
  handler: async (ctx, { bookingId, event }) => {
    const booking = await ctx.runQuery(internal.webhooks.getBookingPayload, {
      bookingId,
    });
    if (booking === null || booking.organizationId === null) return;

    const endpoints = await ctx.runQuery(internal.webhooks.listOrgEndpoints, {
      organizationId: booking.organizationId,
    });
    const payload = canonicalJson({
      event,
      data: booking,
    });

    for (const endpoint of endpoints) {
      const deliveryId = await ctx.runMutation(internal.webhooks.enqueueDelivery, {
        endpointId: endpoint._id,
        event,
        payload,
      });
      await ctx.runAction(internal.webhooks.deliver, { deliveryId });
    }
  },
});

export const getBookingPayload = internalQuery({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.db.get(bookingId);
    if (booking === null) return null;
    const eventType = await ctx.db.get(booking.eventTypeId);
    return {
      id: booking._id,
      organizationId: booking.organizationId ?? null,
      eventTypeSlug: eventType?.slug ?? null,
      eventTypeName: eventType?.name ?? null,
      startTime: booking.startTime,
      endTime: booking.endTime,
      inviteeName: booking.inviteeName,
      inviteeEmail: booking.inviteeEmail,
      inviteeTimezone: booking.inviteeTimezone,
      notes: booking.notes ?? null,
      status: booking.status,
      createdAt: booking.createdAt,
    };
  },
});

export const listOrgEndpoints = internalQuery({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const endpoints = await ctx.db
      .query("webhookEndpoints")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    return endpoints.filter((e) => e.status === "active");
  },
});

export const enqueueDelivery = internalMutation({
  args: {
    endpointId: v.id("webhookEndpoints"),
    event: v.string(),
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookDeliveries", {
      endpointId: args.endpointId,
      event: args.event,
      payload: args.payload,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });
  },
});

// Performs one HTTP delivery attempt (or marks the delivery failed/exhausted).
export const deliver = internalAction({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    const delivery = await ctx.runQuery(internal.webhooks.getDelivery, { deliveryId });
    if (delivery === null) return;

    const endpoint = await ctx.runQuery(internal.webhooks.getEndpoint, {
      endpointId: delivery.endpointId,
    });
    if (endpoint === null || endpoint.status !== "active") {
      await ctx.runMutation(internal.webhooks.markDelivery, {
        deliveryId,
        status: "failed",
        lastError: "Endpoint disabled or missing",
      });
      return;
    }

    const nextAttempt = delivery.nextAttemptAt ?? 0;
    if (delivery.attempts >= MAX_ATTEMPTS) {
      await ctx.runMutation(internal.webhooks.markDelivery, {
        deliveryId,
        status: "exhausted",
        lastError: "Max attempts reached",
      });
      return;
    }
    if (nextAttempt > Date.now()) return; // not due yet; the cron will retry later

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await signPayload(endpoint.secret, timestamp, delivery.payload);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Core829-Signature": signature,
      "X-Core829-Event": delivery.event,
      "User-Agent": "CORE829-Bookings",
    };

    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers,
        body: delivery.payload,
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        await ctx.runMutation(internal.webhooks.markDelivery, {
          deliveryId,
          status: "success",
        });
        return;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      const attempts = delivery.attempts + 1; // this attempt counts
      const backoff = BACKOFF_MS[attempts - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
      const status = attempts >= MAX_ATTEMPTS ? "exhausted" : "failed";
      await ctx.runMutation(internal.webhooks.markDelivery, {
        deliveryId,
        status,
        attempts,
        lastError: err instanceof Error ? err.message : String(err),
        nextAttemptAt: status === "exhausted" ? undefined : Date.now() + backoff,
      });
    }
  },
});

export const getDelivery = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    return await ctx.db.get(deliveryId);
  },
});

export const getEndpoint = internalQuery({
  args: { endpointId: v.id("webhookEndpoints") },
  handler: async (ctx, { endpointId }) => {
    return await ctx.db.get(endpointId);
  },
});

export const markDelivery = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"),
    status: v.union(v.literal("success"), v.literal("failed"), v.literal("exhausted"), v.literal("pending")),
    attempts: v.optional(v.number()),
    lastError: v.optional(v.string()),
    nextAttemptAt: v.optional(v.number()),
  },
  handler: async (ctx, { deliveryId, ...patch }) => {
    await ctx.db.patch(deliveryId, patch);
  },
});

// ---- Cron (webhookDeliveries.by_status_and_nextAttempt sweep) -----------
export const listDueDeliveries = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_status_and_nextAttempt", (q) => q.eq("status", "failed"))
      .filter((q) => q.lte(q.field("nextAttemptAt"), now))
      .collect();
  },
});

export const retryDueDeliveries = internalAction({
  args: {},
  handler: async (ctx) => {
    const due = await ctx.runQuery(internal.webhooks.listDueDeliveries, {});
    for (const delivery of due) {
      if (delivery.attempts < MAX_ATTEMPTS) {
        await ctx.runAction(internal.webhooks.deliver, { deliveryId: delivery._id });
      } else {
        await ctx.runMutation(internal.webhooks.markDelivery, {
          deliveryId: delivery._id,
          status: "exhausted",
        });
      }
    }
  },
});

// ---- Team dashboard -----------------------------------------------------
export const listEndpointsForOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireTeamUser(ctx);
    return await ctx.db
      .query("webhookEndpoints")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const listDeliveriesForOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireTeamUser(ctx);
    const endpoints = await ctx.db
      .query("webhookEndpoints")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
    const endpointIds = endpoints.map((e) => e._id);
    const all = await ctx.db.query("webhookDeliveries").collect();
    return all
      .filter((d) => endpointIds.includes(d.endpointId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);
  },
});

async function requireOrgManager(ctx: Parameters<typeof requireTeamUser>[0]) {
  const caller = await requireTeamUser(ctx);
  if (caller.role !== "owner" && caller.role !== "admin") {
    throw new Error("Only an owner/admin can manage webhook endpoints");
  }
  return caller;
}

export const createEndpoint = mutation({
  args: {
    organizationId: v.id("organizations"),
    url: v.string(),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrgManager(ctx);
    if (!/^https:\/\//i.test(args.url)) {
      throw new Error("Webhook URL must be https");
    }
    // Random secret, shown once on creation in the UI.
    const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    await ctx.db.insert("webhookEndpoints", {
      organizationId: args.organizationId,
      url: args.url,
      secret,
      events: args.events,
      status: "active",
      createdAt: Date.now(),
    });
    return { secret };
  },
});

export const updateEndpoint = mutation({
  args: {
    endpointId: v.id("webhookEndpoints"),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("active"), v.literal("disabled"))),
  },
  handler: async (ctx, { endpointId, ...patch }) => {
    await requireOrgManager(ctx);
    if (patch.url !== undefined && !/^https:\/\//i.test(patch.url)) {
      throw new Error("Webhook URL must be https");
    }
    await ctx.db.patch(endpointId, patch);
  },
});

export const resendDelivery = mutation({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, { deliveryId }) => {
    await requireOrgManager(ctx);
    const delivery = await ctx.db.get(deliveryId);
    if (delivery === null) return;
    await ctx.db.patch(deliveryId, {
      status: "pending",
      attempts: 0,
      lastError: undefined,
      nextAttemptAt: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.webhooks.deliver, { deliveryId });
  },
});