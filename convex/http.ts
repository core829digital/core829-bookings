import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { auth } from "./auth";
import { rateLimiter } from "./lib/rateLimit";
import {
  hashSecret,
  requiredScope,
  timingSafeEqualHex,
} from "./lib/apiKeys";

// Convex passes route params on the Request object at runtime; the Fetch
// `Request` type doesn't know about them, so narrow it here.
interface RouteRequest extends Request {
  params: Record<string, string>;
}

const http = httpRouter();

auth.addHttpRoutes(http);

// ---------------------------------------------------------------------------
// Phase 3: versioned public API for external customer sites, authenticated by
// API key (`Authorization: Bearer bk_live_...`). Every `organizationId` used
// downstream is derived HERE from the validated key — never from client input
// (multi-tenant isolation invariant).
// ---------------------------------------------------------------------------

// State shared by the route handler closures so we can log usage uniformly.
interface AuthResult {
  apiKeyId: string;
  organizationId: string;
  environment: "live" | "test";
  scopes: string[];
}

async function authenticate(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request
): Promise<AuthResult | { error: string; status: number }> {
  const header = request.headers.get("authorization");
  if (header === null || !header.toLowerCase().startsWith("bearer ")) {
    return { error: "Missing API key", status: 401 };
  }
  const token = header.slice(7).trim();
  const match = /^bk_(live|test)_([a-zA-Z0-9]+)$/.exec(token);
  if (!match) return { error: "Invalid API key format", status: 401 };
  const environment = match[1] as "live" | "test";
  const secret = match[2];
  const prefix = secret.slice(0, 8);

  const key = await ctx.runQuery(internal.lib.apiKeys.getByPrefix, { prefix });
  if (key === null || key.status !== "active") {
    return { error: "Invalid API key", status: 401 };
  }
  if (key.environment !== environment) {
    return { error: "Invalid API key", status: 401 };
  }
  // Constant-time compare of sha256(secret + pepper) vs stored hash.
  if (!timingSafeEqualHex(await hashSecret(secret), key.hashedSecret)) {
    return { error: "Invalid API key", status: 401 };
  }

  // Per-key rate limit via the mounted @convex-dev/rate-limiter component.
  const rate = await rateLimiter.limit(ctx, "apiKeyRequests", {
    key: key._id,
    throws: false,
  });
  if (!rate.ok) {
    return { error: "Rate limit exceeded", status: 429 };
  }

  // Touch lastUsedAt + log usage after a successful auth (fires-and-forgets;
  // failures here must not break the request).
  await ctx.runMutation(internal.lib.apiKeys.touchLastUsed, { apiKeyId: key._id });

  return {
    apiKeyId: key._id as string,
    organizationId: key.organizationId as string,
    environment,
    scopes: key.scopes,
  };
}

async function logUsage(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  apiKeyId: string,
  route: string,
  statusCode: number,
  ip: string | undefined
) {
  try {
    await ctx.runMutation(internal.lib.apiKeys.recordUsage, {
      apiKeyId: apiKeyId as never,
      route,
      statusCode,
      ip,
    });
  } catch (err) {
    console.error("[v1] failed to record usage", err);
  }
}

function clientIp(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

async function requireScope(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  route: string
): Promise<
  | { ok: true; auth: AuthResult; ip: string | undefined }
  | { ok: false; response: Response }
> {
  const auth = await authenticate(ctx, request);
  if ("error" in auth) {
    const status = auth.status;
    const response = Response.json({ error: auth.error }, { status });
    return { ok: false, response };
  }
  const routeScope = requiredScope(route);
  if (routeScope !== null && !auth.scopes.includes(routeScope)) {
    return {
      ok: false,
      response: Response.json(
        { error: `Missing scope: ${routeScope}` },
        { status: 403 }
      ),
    };
  }
  return { ok: true, auth, ip: clientIp(request) };
}

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

// GET /v1/event-types
http.route({
  path: "/v1/event-types",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const route = "GET /v1/event-types";
    const checked = await requireScope(ctx, request, route);
    if (!checked.ok) return checked.response;
    const eventTypes = await ctx.runQuery(internal.internal.bookings.listEventTypesForApi, {});
    await logUsage(ctx, checked.auth.apiKeyId, route, 200, checked.ip);
    return Response.json({ data: eventTypes });
  }),
});

// GET /v1/event-types/:slug/slots?date_from=&date_to=&timezone=
http.route({
  path: "/v1/event-types/:slug/slots",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const route = "GET /v1/event-types/:slug/slots";
    const checked = await requireScope(ctx, request, route);
    if (!checked.ok) return checked.response;
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const timezone = url.searchParams.get("timezone");

    if (!dateFrom || !dateTo || !timezone) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 400, checked.ip);
      return jsonError(400, "Missing date_from, date_to or timezone");
    }

    let slots;
    try {
      slots = await ctx.runQuery(api.slots.getAvailableSlots, {
        eventTypeSlug: (request as RouteRequest).params.slug as string,
        dateFrom,
        dateTo,
        timezone,
      });
    } catch (err) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 400, checked.ip);
      return jsonError(400, err instanceof Error ? err.message : "Invalid request");
    }
    await logUsage(ctx, checked.auth.apiKeyId, route, 200, checked.ip);
    return Response.json({ data: slots });
  }),
});

// POST /v1/bookings
http.route({
  path: "/v1/bookings",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const route = "POST /v1/bookings";
    const checked = await requireScope(ctx, request, route);
    if (!checked.ok) return checked.response;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      await logUsage(ctx, checked.auth.apiKeyId, route, 400, checked.ip);
      return jsonError(400, "Invalid JSON body");
    }

    const startTime = Number(body.startTime);
    const result = await ctx.runMutation(internal.internal.bookings.createForOrganization, {
      organizationId: checked.auth.organizationId as never,
      eventTypeSlug: String(body.eventTypeSlug),
      startTime: Number.isFinite(startTime) ? startTime : NaN,
      inviteeName: String(body.inviteeName ?? ""),
      inviteeEmail: String(body.inviteeEmail ?? ""),
      inviteeTimezone: String(body.inviteeTimezone ?? ""),
      notes: body.notes === undefined ? undefined : String(body.notes),
    }).catch((err) => {
      return { error: err instanceof Error ? err.message : String(err) };
    });

    if (typeof result === "object" && result !== null && "error" in result) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 400, checked.ip);
      return jsonError(400, result.error as string);
    }

    await logUsage(ctx, checked.auth.apiKeyId, route, 201, checked.ip);
    return Response.json({ data: result }, { status: 201 });
  }),
});

// GET /v1/bookings/:id
http.route({
  path: "/v1/bookings/:id",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const route = "GET /v1/bookings/:id";
    const checked = await requireScope(ctx, request, route);
    if (!checked.ok) return checked.response;
    const booking = await ctx.runQuery(internal.internal.bookings.getById, {
      bookingId: (request as RouteRequest).params.id as never,
      organizationId: checked.auth.organizationId as never,
    });
    if (booking === null) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 404, checked.ip);
      return jsonError(404, "Booking not found");
    }
    await logUsage(ctx, checked.auth.apiKeyId, route, 200, checked.ip);
    return Response.json({ data: booking });
  }),
});

// POST /v1/bookings/:id/cancel
http.route({
  path: "/v1/bookings/:id/cancel",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const route = "POST /v1/bookings/:id/cancel";
    const checked = await requireScope(ctx, request, route);
    if (!checked.ok) return checked.response;
    const result = await ctx.runMutation(internal.internal.bookings.cancelForOrganization, {
      bookingId: (request as RouteRequest).params.id as never,
      organizationId: checked.auth.organizationId as never,
    }).catch((err) => ({ error: err instanceof Error ? err.message : String(err) }));

    if ("error" in result) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 404, checked.ip);
      return jsonError(404, result.error as string);
    }
    await logUsage(ctx, checked.auth.apiKeyId, route, 200, checked.ip);
    return Response.json({ data: result });
  }),
});

// POST /v1/bookings/:id/reschedule
http.route({
  path: "/v1/bookings/:id/reschedule",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const route = "POST /v1/bookings/:id/reschedule";
    const checked = await requireScope(ctx, request, route);
    if (!checked.ok) return checked.response;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      await logUsage(ctx, checked.auth.apiKeyId, route, 400, checked.ip);
      return jsonError(400, "Invalid JSON body");
    }
    const newStartTime = Number(body.newStartTime);
    if (!Number.isFinite(newStartTime)) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 400, checked.ip);
      return jsonError(400, "Missing newStartTime");
    }

    const result = await ctx.runMutation(internal.internal.bookings.rescheduleForOrganization, {
      bookingId: (request as RouteRequest).params.id as never,
      organizationId: checked.auth.organizationId as never,
      newStartTime,
    }).catch((err) => ({ error: err instanceof Error ? err.message : String(err) }));

    if ("error" in result) {
      await logUsage(ctx, checked.auth.apiKeyId, route, 404, checked.ip);
      return jsonError(404, result.error as string);
    }
    await logUsage(ctx, checked.auth.apiKeyId, route, 200, checked.ip);
    return Response.json({ data: result });
  }),
});

export default http;