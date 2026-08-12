# core829-bookings

bookings.core829.net — CORE829's custom booking platform (Convex + Next.js). See
the full architecture/phase plan in project memory / prior planning conversation.

Currently built: Phase 0 (Next.js App Router + Tailwind CORE829 design
tokens, Convex Auth) and the Phase 1 core booking mechanic — event types,
weekly availability + date exceptions, timezone-aware slot computation
(`convex/lib/slotEngine.ts`, Luxon-based, DST-safe), the public booking flow
at `/book/[slug]`, transactional double-booking-safe `bookings.create`, and
cancel/reschedule via a bearer `cancelToken` link at `/bookings/[token]`.
Not built yet: team calendar UI, availability editor UI, reminder emails,
and everything from Phase 2 onward (see the full plan).

## First-time setup (manual, requires interactive login)

1. `npm install` (already done if you're reading this from the scaffolded repo)
2. `npx convex dev` — logs in via browser OAuth, creates the Convex project,
   writes `CONVEX_DEPLOYMENT` / generates `.env.local`, and generates
   `convex/_generated/*`. Leave this running in a terminal during development.
3. `npx @convex-dev/auth` — one-time setup that generates the JWT signing
   keypair and pushes `SITE_URL` / `JWT_PRIVATE_KEY` / `JWKS` as server-side
   env vars on your Convex deployment (not `.env.local` — Convex functions
   read their own env vars, set via `npx convex env set KEY value` or the
   Convex dashboard, not the Next.js `.env.local`).
4. For booking confirmation emails: `npx convex env set RESEND_API_KEY ...`,
   `npx convex env set BOOKING_FROM_EMAIL "CORE829 Bookings <...>"` (see
   `.env.local.example` for the full list — those are Convex-side vars
   despite living in that file for reference).
5. `npm run dev` — sign up at `/signin` (first account becomes `owner`, see
   `convex/users.ts`), which redirects to `/calendar` and prompts you to
   complete your profile (name + timezone).
6. Seed one test event type + Mon-Fri 09:00-17:00 availability for that
   account: `npx convex run seed:devSeed '{"ownerEmail":"you@example.com"}'`.
   Then book it end-to-end at `/book/intro-call`.

## Stack

- Next.js App Router + Tailwind v4, design tokens mirrored from
  `core829-new-final` (`src/app/globals.css`).
- Convex: serverless functions + realtime DB + cron, no separate infra.
- `@convex-dev/auth` (Password provider) for team/staff login — self-serve
  signup is not gated at the UI level yet but is intended to be
  invite-only once Phase 2 team management ships.
- Luxon for IANA-timezone-aware slot computation.
- Resend for booking confirmation emails (`convex/emails.ts`, mirrors the
  `core829-new-final` `app/api/contact/route.ts` pattern).
- `@convex-dev/rate-limiter` installed, reserved for Phase 3 API-key rate
  limiting — not wired up yet.

## Deploy

Separate Vercel project (not the core829.net one) + `bookings` CNAME +
separate Convex production deployment. See the full plan for env var list.
