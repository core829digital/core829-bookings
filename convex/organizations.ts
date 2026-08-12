import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTeamUser } from "./authz";
import { generateApiKey, hashSecret, scopes, timingSafeEqualHex } from "./lib/apiKeys";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ---- Organizations ------------------------------------------------------

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireTeamUser(ctx);
    const orgs = await ctx.db.query("organizations").collect();
    return await Promise.all(
      orgs.map(async (org) => {
        const keys = await ctx.db
          .query("apiKeys")
          .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
          .collect();
        const webhooks = await ctx.db
          .query("webhookEndpoints")
          .withIndex("by_organization", (q) => q.eq("organizationId", org._id))
          .collect();
        return { org, keyCount: keys.length, webhookCount: webhooks.length };
      })
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    plan: v.union(v.literal("internal"), v.literal("free"), v.literal("paid")),
  },
  handler: async (ctx, args) => {
    const caller = await requireTeamUser(ctx);
    if (caller.role !== "owner" && caller.role !== "admin") {
      throw new Error("Only an owner/admin can create organizations");
    }
    const slug = args.slug ?? slugify(args.name);
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("Invalid slug");
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing !== null) throw new Error("Slug already in use");
    return await ctx.db.insert("organizations", {
      name: args.name,
      slug,
      ownerUserId: caller._id,
      plan: args.plan,
      createdAt: Date.now(),
    });
  },
});

// ---- API keys -----------------------------------------------------------

export const listKeysForOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireTeamUser(ctx);
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

// Returns `{ keyId, fullKey, createdAt }` — `fullKey` is the ONLY time the
// plaintext key exists; the caller must display it immediately and never
// store it. Convex immutable "write-once" caveat: values written in this
// mutation are returned to the client and never persisted in plaintext.
export const issueKey = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    environment: v.union(v.literal("live"), v.literal("test")),
    scopes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const caller = await requireTeamUser(ctx);
    if (caller.role !== "owner" && caller.role !== "admin") {
      throw new Error("Only an owner/admin can issue API keys");
    }
    const org = await ctx.db.get(args.organizationId);
    if (org === null) throw new Error("Organization not found");

    const invalid = args.scopes.filter((s) => !(scopes as readonly string[]).includes(s));
    if (invalid.length > 0) throw new Error(`Unknown scope: ${invalid.join(", ")}`);
    if (args.scopes.length === 0) throw new Error("At least one scope is required");

    const { fullKey, prefix, hashedSecret } = await generateApiKey(args.environment);
    const now = Date.now();
    const keyId = await ctx.db.insert("apiKeys", {
      organizationId: args.organizationId,
      name: args.name,
      prefix,
      hashedSecret,
      scopes: args.scopes,
      environment: args.environment,
      status: "active",
      createdAt: now,
    });
    return { keyId, fullKey };
  },
});

export const revokeKey = mutation({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, { apiKeyId }) => {
    const caller = await requireTeamUser(ctx);
    const key = await ctx.db.get(apiKeyId);
    if (key === null) throw new Error("Key not found");
    const org = await ctx.db.get(key.organizationId);
    if (org === null || org.ownerUserId !== caller._id) {
      if (caller.role !== "owner" && caller.role !== "admin") {
        throw new Error("Not authorized to revoke this key");
      }
    }
    await ctx.db.patch(apiKeyId, { status: "revoked", revokedAt: Date.now() });
  },
});

// ---- Usage logs ---------------------------------------------------------

export const usageForKey = query({
  args: { apiKeyId: v.id("apiKeys") },
  handler: async (ctx, { apiKeyId }) => {
    await requireTeamUser(ctx);
    const logs = await ctx.db
      .query("apiKeyUsageLogs")
      .withIndex("by_apiKey_and_time", (q) => q.eq("apiKeyId", apiKeyId))
      .order("desc")
      .take(200);
    return logs;
  },
});

// Verify path used in tests / curl examples: not a UI feature, but kept for
// parity with the HTTP route's lookup (internal call path).
export const verify = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, { apiKey }) => {
    await requireTeamUser(ctx);
    const match = /^bk_(live|test)_([a-zA-Z0-9]+)$/.exec(apiKey);
    if (!match) return { ok: false, error: "Invalid key format" };
    const prefix = match[2].slice(0, 8);
    const key = await ctx.db
      .query("apiKeys")
      .withIndex("by_prefix", (q) => q.eq("prefix", prefix))
      .unique();
    if (key === null || key.status !== "active") {
      return { ok: false, error: "Key not found or revoked" };
    }
    const ok = timingSafeEqualHex(await hashSecret(match[2]), key.hashedSecret);
    return ok
      ? { ok: true, organizationId: key.organizationId }
      : { ok: false, error: "Secret mismatch" };
  },
});