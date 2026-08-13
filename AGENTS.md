<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Core829 Bookings — Project Overview

bookings.core829.net — CORE829's custom booking platform. Public booking
widget, team workspace, and a versioned public API for external customer
sites.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript (strict) + Tailwind v4
- **Convex**: database, backend functions, realtime, crons — see
  `convex/_generated/ai/guidelines.md` before writing Convex code
- **Convex Auth** (Password provider), **Resend** (email), **Luxon** (timezones)
- **@convex-dev/rate-limiter** component (mounted in `convex/convex.config.ts`)
  for per-API-key quotas

## Roadmap (current state)

- [x] **Phase 1 — Booking mechanic**: `eventTypes`, `availabilityRules`/
      `availabilityExceptions`, `lib/slotEngine` (Luxon, DST-safe slot math),
      double-booking-safe `bookings.create`, cancel/reschedule via bearer
      `cancelToken`, public flow `/book/[slug]` + `/bookings/[token]`
- [x] **Phase 2 — Team workspace**: `/calendar`, `/availability`,
      `/event-types`, `/team` (roles owner/admin/member), reminder cron
- [x] **Phase 3 — Public API**: `organizations`, Stripe-style `apiKeys`
      (`bk_live_`/`bk_test_`, prefix + hashed-shared-secret w/ pepper),
      per-key rate limiting + `apiKeyUsageLogs`, org-scoped `/v1` routes in
      `convex/http.ts`, org management UI `/organizations`
- [x] **Phase 4 — Webhooks & notifications**: HMAC-signed deliveries
      (Stripe-style `t=…,v1=…`), backoff 1m→5m→30m→2h→24h max 5 attempts,
      retry cron, Resend confirmation/reminder/office emails
      (`convex/emails.ts`), embeddable widget `/embed/[slug]`, hosted org
      pages `/o/[orgSlug]`
- [ ] **Phase 5 — Polish**: mobile refinements, accessibility, performance +
      security + SEO audits, final QA

## Conventions

- **Public booking flow**:
  - `BookingWidget` (`src/components/BookingWidget.tsx`) is THE reusable
    client flow — full page, embed iframe, and homepage preview all use it.
  - Slots: `slots.getAvailableSlots` (pure logic in `lib/slotEngine.ts`).
  - Create/cancel/reschedule: `bookings.*` (public widget + API both funnel
    here); cancel via bearer `cancelToken`.
- **Team-only functions** must call `requireTeamUser` from `convex/authz.ts`
  first. Never trust a client-supplied `userId` for authorization.
- **Public API isolation invariant** (critical): `organizationId` is ALWAYS
  derived server-side from the validated API key in `convex/http.ts` —
  never from client input. Org-scoped ops live in `convex/internal/bookings.ts`
  (internal-only, referenced as `internal.internal.bookings.*` via the nested
  file, NOT via the client `api` object).
- **Scheduling**: schedule emails/webhooks with
  `ctx.scheduler.runAfter(0, internal.*)` immediately after writes, from the
  same mutation — don't fire-and-forget from the client.
- **Emails** (`convex/emails.ts`): HTML templates escape all user input
  (`escapeHtml`). Recipient env vars: `RESEND_API_KEY`, `BOOKING_FROM_EMAIL`,
  `BOOKING_NOTIFY_TO_EMAIL` (default `hello@core829.net`).
- **Webhooks** (`convex/webhooks.ts`): canonical payload string stored with the
  delivery (`webhookDeliveries.payload`) so retries sign the exact bytes; POST
  with `t=<ts>,v1=<hmac sha256 hex>` headers.
- **Styling**: CORE829 design tokens live in `src/app/globals.css` (accent red,
  JetBrains Mono, `kicker`/`tech-label`/`input-core829` helpers). Reuse the
  shared `PublicHeader`/`PublicFooter`/`Button` — don't hand-roll chrome.
- **Middleware**: auth gating is `src/proxy.ts` (Next 16 convention; exported
  as `proxy`, not `middleware`).

## Environment variables

- Next.js `.env.local`: `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`.
- Convex deployment env (`npx convex env set`): `RESEND_API_KEY`,
  `BOOKING_FROM_EMAIL`, `BOOKING_NOTIFY_TO_EMAIL`, `API_KEY_HASH_PEPPER`,
  plus Convex Auth vars (`SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`).

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->