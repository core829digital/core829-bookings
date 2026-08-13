# core829-bookings

bookings.core829.net — CORE829's custom booking platform. Customers book via a
public calendar, the team manages availability/event types/bookings, and
external customer sites can embed a widget or connect over a versioned API.

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript (strict) + Tailwind v4
+ Convex (database/backend, realtime, crons) + Convex Auth (password) + Resend
(transactional email) + Luxon (IANA-timezone slot math).

## Roadmap status

- [x] Phase 0 — app shell, Convex + Convex Auth wiring, CORE829 design tokens
- [x] Phase 1 — core booking mechanic (event types, availability, slots, bookings,
      cancel/reschedule via bearer cancelToken)
- [x] Phase 2 — team workspace (calendar, availability editor, event-type editor,
      team roles)
- [x] Phase 3 — public API (organizations, Stripe-style API keys, rate limiting,
      per-key usage logs)
- [x] Phase 4 — webhooks (HMAC-signed, retry w/ backoff) + email notifications
      (confirmation, reminders, office notification)
- [ ] Phase 5 — polish, SEO, performance & security audit

## Feature summary

### Booking mechanic (Phase 1)
- Event types with location, buffers, min-notice / max-advance policies.
- Weekly availability rules + per-date exceptions; timezone-aware slot
  computation (`convex/lib/slotEngine.ts`, Luxon-based, DST-safe).
- Double-booking-safe `bookings.create` (overlap re-check inside the mutation,
  Convex OCC) and cancel/reschedule via a per-booking `cancelToken` link.
- Public booking flow at `/book/[slug]`, management page `/bookings/[token]`.

### Team workspace (Phase 2)
- Weekly calendar grid (`/calendar`) with quick-create and host-side cancel.
- Availability editor (`/availability`), event-type editor (`/event-types`),
  team list + role switcher owner/admin/member (`/team`).
- First account to complete its profile becomes `owner`; self-serve signup is
  gated at the auth-provider level.

### Public API (Phase 3, `/v1`)
- Organizations with `internal | free | paid` plans; per-org API keys.
- Keys look like `bk_live_<24 base62 chars>`; only prefix + `sha256(secret +
  pepper)` are stored (`convex/lib/apiKeys.ts`), full value shown once.
- Token-bucket rate limiting per key (60 req/min) via the mounted
  `@convex-dev/rate-limiter` component.
- Per-key usage logging (`apiKeyUsageLogs`) + `lastUsedAt` tracking.
- Multi-tenant isolation: the `organizationId` is always derived server-side
  from the validated key, never from client input.

Routes (`convex/http.ts`):
- `GET /v1/event-types`
- `GET /v1/event-types/:slug/slots?date_from=&date_to=&timezone=`
- `POST /v1/bookings`
- `GET /v1/bookings/:id`
- `POST /v1/bookings/:id/cancel`
- `POST /v1/bookings/:id/reschedule`

Auth: `Authorization: Bearer bk_live_...`. Scopes: `event-types:read`,
`bookings:read`, `bookings:write`.

### Webhooks & notifications (Phase 4)
- Per-org webhook endpoints (Stripe-style HMAC signature `t=…,v1=…`, SHA-256).
- Events: `booking.created`, `booking.rescheduled`, `booking.cancelled`.
- Delivery with exponential backoff (1m → 5m → 30m → 2h → 24h, max 5 attempts);
  a 1-minute cron retries failed deliveries; manual resend from the UI.
- Transactional email via Resend (`convex/emails.ts`):
  - confirmation to the invitee on create/reschedule,
  - reminders `24h` / `1h` before (15-minute cron sweep),
  - office notification on every new booking
    (`BOOKING_NOTIFY_TO_EMAIL`, default `hello@core829.net`).

## Public surface (pages)

- `/` — homepage (hero, live booking widget, value props, Trustpilot, CTA)
- `/book/[slug]` — full-page booking flow
- `/bookings/[token]` — manage / cancel a booking
- `/embed/[slug]` — chrome-free flow for iframing into any site
- `/o/[orgSlug]` — hosted booking page per organization
- `/signin` — team sign-in / sign-up
- `/calendar`, `/availability`, `/event-types`, `/organizations`, `/team` — team
  workspace (auth-protected via `convexAuthNextjsMiddleware`)

## Environment variables

Next.js side (`.env.local`):

| Var | Purpose |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Set by the Convex CLI after login (`dev:<project>`) |
| `NEXT_PUBLIC_CONVEX_URL` | Public Convex URL |

Convex deployment env (set via `npx convex env set KEY value`, referenced with
`process.env` inside Convex functions):

| Var | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Sends confirmation/reminder/office emails |
| `BOOKING_FROM_EMAIL` | Sender for booking emails |
| `BOOKING_NOTIFY_TO_EMAIL` | Office notification recipient (default `hello@core829.net`) |
| `API_KEY_HASH_PEPPER` | Server-side salt for hashing API-key secrets |

Plus the Convex Auth vars pushed by the `@convex-dev/auth` setup
(`SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`).

## Development

```bash
npm install
npx convex dev          # login, create project, write .env.local, generate _generated
npm run dev             # start Next.js
```

- Sign up at `/signin` (first account becomes `owner`) and complete the profile
  (name + timezone).
- Seed one event type + Mon–Fri 09:00–17:00 availability:
  `npx convex run seed:devSeed '{"ownerEmail":"you@example.com"}'`
- Book end-to-end at `/book/intro-call`.

## Deploy

- Frontend: separate Vercel project + `bookings` CNAME → `bookings.core829.net`.
- Backend: separate Convex production deployment; set all env vars above there.
- See `src/app/layout.tsx` for the shared metadata (`metadataBase`, OG images,
  favicon) used across all public pages.