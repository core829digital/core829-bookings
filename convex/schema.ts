import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Phase 1 (booking mechanic) + Phase 3/4 (external API-key platform +
// outgoing webhooks) — see project plan for the full phase breakdown.
export default defineSchema({
  ...authTables,

  // `role`/`timezone` are optional because Convex Auth inserts this row
  // automatically on sign-up with only email/name — profile completion
  // (role + timezone) happens afterward via users.seedProfile.
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("owner"), v.literal("admin"), v.literal("member"))),
    timezone: v.optional(v.string()), // IANA tz, e.g. "Europe/Bucharest"
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("by_email", ["email"]),

  eventTypes: defineTable({
    organizationId: v.optional(v.id("organizations")), // undefined = internal CORE829 event type
    ownerUserId: v.id("users"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    location: v.union(
      v.literal("google_meet"),
      v.literal("phone"),
      v.literal("in_person"),
      v.literal("custom")
    ),
    locationDetail: v.optional(v.string()),
    bufferBeforeMinutes: v.number(),
    bufferAfterMinutes: v.number(),
    minNoticeMinutes: v.number(),
    maxAdvanceDays: v.number(),
    active: v.boolean(),
  })
    .index("by_owner", ["ownerUserId"])
    .index("by_slug", ["slug"]),

  availabilityRules: defineTable({
    userId: v.id("users"),
    weekday: v.number(), // 0-6
    startMinute: v.number(), // minutes from midnight, in the user's own timezone
    endMinute: v.number(),
  }).index("by_user", ["userId"]),

  availabilityExceptions: defineTable({
    userId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD" in the user's timezone
    type: v.union(v.literal("unavailable"), v.literal("custom_hours")),
    startMinute: v.optional(v.number()),
    endMinute: v.optional(v.number()),
  }).index("by_user_and_date", ["userId", "date"]),

  bookings: defineTable({
    eventTypeId: v.id("eventTypes"),
    hostUserId: v.id("users"),
    organizationId: v.optional(v.id("organizations")), // which external site this came through (Phase 3)
    startTime: v.number(), // UTC epoch ms — always store UTC
    endTime: v.number(),
    inviteeName: v.string(),
    inviteeEmail: v.string(),
    inviteeTimezone: v.string(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("rescheduled")
    ),
    cancelToken: v.string(), // bearer secret used in the manage-booking email link
    rescheduledFromBookingId: v.optional(v.id("bookings")),
    remindersSent: v.array(v.string()), // e.g. ["24h","1h"]
    createdAt: v.number(),
    // Which CORE829 service the invitee wants to discuss — lets the team
    // prep for the call. Undefined for legacy bookings made before this
    // field existed.
    service: v.optional(v.string()),
    // In-app notification tracking: undefined/false = shows as "new" on the
    // team calendar until a team member opens it.
    seenByTeam: v.optional(v.boolean()),
  })
    .index("by_host_and_time", ["hostUserId", "startTime"])
    .index("by_cancelToken", ["cancelToken"])
    .index("by_organization", ["organizationId"])
    .index("by_eventType_and_time", ["eventTypeId", "startTime"])
    // Backs the reminder cron's scan across all hosts (convex/reminders.ts).
    .index("by_status_and_startTime", ["status", "startTime"]),

  // Delivery log for every transactional email attempt — makes silent
  // failures (e.g. a suppressed recipient address) visible in the
  // dashboard instead of only in Convex function logs.
  emailLogs: defineTable({
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
    createdAt: v.number(),
  }).index("by_time", ["createdAt"]),

  // ---- Phase 3: external API-key platform -------------------------------
  // External "customer sites" that hold API keys and receive webhooks.
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerUserId: v.id("users"),
    plan: v.union(v.literal("internal"), v.literal("free"), v.literal("paid")),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_owner", ["ownerUserId"]),

  apiKeys: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    prefix: v.string(), // plaintext, indexed lookup key
    hashedSecret: v.string(), // sha256(secret + pepper)
    scopes: v.array(v.string()),
    environment: v.union(v.literal("live"), v.literal("test")),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_prefix", ["prefix"])
    .index("by_organization", ["organizationId"]),

  apiKeyUsageLogs: defineTable({
    apiKeyId: v.id("apiKeys"),
    route: v.string(),
    statusCode: v.number(),
    ip: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_apiKey_and_time", ["apiKeyId", "timestamp"])
    .index("by_time", ["timestamp"]),

  // ---- Phase 4: outgoing webhooks --------------------------------------
  webhookEndpoints: defineTable({
    organizationId: v.id("organizations"),
    url: v.string(),
    secret: v.string(), // HMAC signing secret, shown once at creation
    events: v.array(v.string()), // ["booking.created","booking.rescheduled","booking.cancelled"]
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),

  webhookDeliveries: defineTable({
    endpointId: v.id("webhookEndpoints"),
    event: v.string(),
    payload: v.string(), // canonical JSON string — exact bytes that were signed
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("exhausted")
    ),
    attempts: v.number(),
    nextAttemptAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_status_and_nextAttempt", ["status", "nextAttemptAt"])
    .index("by_endpoint", ["endpointId"]),
});
