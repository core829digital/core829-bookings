import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

// ---- API-key cryptography (Stripe-style) --------------------------------
// A key looks like `bk_live_<24 random base62 chars>`. The full key is
// shown exactly once at issuance. We store only `prefix` in plaintext
// (indexed, for lookup + display) and `hashedSecret`, which is
// sha256(secret + API_KEY_HASH_PEPPER). The pepper is a server-side env var
// so a DB-only leak of hashedSecret can't be offline-brute-forced.
//
// Uses the global WebCrypto API (also used elsewhere for crypto.randomUUID),
// so this module runs fine in the default Convex runtime.

const KEY_BASE = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SECRET_LENGTH = 24;
const PREFIX_LENGTH = 8;

function toBase62(bytes: Uint8Array): string {
  let out = "";
  let number = BigInt(0);
  for (const b of bytes) number = (number << BigInt(8)) | BigInt(b);
  const base = BigInt(KEY_BASE.length);
  while (number > BigInt(0)) {
    out = KEY_BASE[Number(number % base)] + out;
    number /= base;
  }
  // Pad to keep a stable length regardless of leading zero bytes.
  return out.padStart(SECRET_LENGTH, KEY_BASE[0]);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Server-only: generate a full `bk_live_...` key plus what to persist. Only
// the caller (issuance mutation) ever sees `fullKey`; it is never stored or
// logged anywhere.
export async function generateApiKey(environment: "live" | "test") {
  const secret = toBase62(crypto.getRandomValues(new Uint8Array(18))); // 144 bits of entropy
  return {
    fullKey: `bk_${environment}_${secret}`,
    prefix: secret.slice(0, PREFIX_LENGTH),
    hashedSecret: await hashSecret(secret),
  };
}

// sha256(secret + pepper) hex digest, with constant-time comparison done via
// `timingSafeEqualHex`. Server-side pepper means a DB-only leak of
// hashedSecret isn't offline-brute-forceable.
export async function hashSecret(secret: string): Promise<string> {
  const pepper = process.env.API_KEY_HASH_PEPPER ?? "";
  return sha256Hex(secret + pepper);
}

// Constant-time comparison — never use `!==` on hashed secrets.
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const scopes = ["event-types:read", "bookings:read", "bookings:write"] as const;
export type Scope = (typeof scopes)[number];

const routeScopes: Record<string, Scope> = {
  "GET /v1/event-types": "event-types:read",
  "GET /v1/event-types/:slug/slots": "event-types:read",
  "POST /v1/bookings": "bookings:write",
  "GET /v1/bookings/:id": "bookings:read",
  "POST /v1/bookings/:id/cancel": "bookings:write",
  "POST /v1/bookings/:id/reschedule": "bookings:write",
};

export function requiredScope(route: string): Scope | null {
  return routeScopes[route] ?? null;
}

// ---- Internal DB access used by HTTP actions ----------------------------
// Every `organizationId` a caller can touch is derived here from the
// matching apiKey row — never from client-supplied fields.

export const getByPrefix = internalQuery({
  args: { prefix: v.string() },
  handler: async (ctx, { prefix }) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_prefix", (q) => q.eq("prefix", prefix))
      .unique();
  },
});

export const touchLastUsed = internalMutation({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, { apiKeyId }) => {
    await ctx.db.patch(apiKeyId, { lastUsedAt: Date.now() });
  },
});

export const recordUsage = internalMutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    route: v.string(),
    statusCode: v.number(),
    ip: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiKeyUsageLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});