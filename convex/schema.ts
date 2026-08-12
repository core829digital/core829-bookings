import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// Phase 1 schema: single-host booking mechanic, no API-key/organizations/webhook
// layer yet (that's Phase 3/4 — see project plan). Tables below are added
// incrementally as phases land; do not add organizations/apiKeys/webhookEndpoints
// until the core booking flow works end-to-end.
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
  })
    .index("by_host_and_time", ["hostUserId", "startTime"])
    .index("by_cancelToken", ["cancelToken"])
    .index("by_eventType_and_time", ["eventTypeId", "startTime"])
    // Backs the reminder cron's scan across all hosts (convex/reminders.ts).
    .index("by_status_and_startTime", ["status", "startTime"]),
});
