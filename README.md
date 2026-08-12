# core829-bookings

bookings.core829.net — CORE829's custom booking platform (Convex + Next.js). See
the full architecture/phase plan in project memory / prior planning conversation.

Currently scaffolded: Phase 0 foundations (Next.js 15 App Router + Tailwind
CORE829 design tokens, Convex Auth wired, `users`/`eventTypes`/
`availabilityRules`/`availabilityExceptions`/`bookings` schema). Slot
computation, the public booking flow, and everything from Phase 2 onward is
not built yet.

## First-time setup (manual, requires interactive login)

1. `npm install` (already done if you're reading this from the scaffolded repo)
2. `npx convex dev` — logs in via browser OAuth, creates the Convex project,
   writes `CONVEX_DEPLOYMENT` / generates `.env.local`, and generates
   `convex/_generated/*` (required before the app will typecheck or build —
   `src/app/calendar/page.tsx` and `src/app/signin/page.tsx` import from it).
   Leave this running in a terminal during development.
3. `npx @convex-dev/auth` — one-time setup that generates the JWT signing
   keypair and pushes `JWT_PRIVATE_KEY` / `JWKS` as server-side env vars on
   your Convex deployment (not in `.env.local` — those are Convex-side
   secrets, set via the Convex dashboard/CLI).
4. Copy `.env.local.example` values you need beyond what step 2 wrote
   (Resend keys, etc.) into `.env.local`.
5. `npm run dev` — sign up at `/signin` (first account becomes `owner`, see
   `convex/users.ts`), which redirects to `/calendar`.

## Stack

- Next.js 15 App Router + Tailwind v4, design tokens mirrored from
  `core829-new-final` (`src/app/globals.css`).
- Convex: serverless functions + realtime DB + cron, no separate infra.
- `@convex-dev/auth` (Password provider) for team/staff login — self-serve
  signup is not gated at the UI level yet but is intended to be
  invite-only once Phase 2 team management ships.
- Luxon for IANA-timezone-aware slot computation (Phase 1, not yet built).
- `@convex-dev/rate-limiter` reserved for Phase 3 API-key rate limiting.

## Deploy

Separate Vercel project (not the core829.net one) + `bookings` CNAME +
separate Convex production deployment. See the full plan for env var list.
