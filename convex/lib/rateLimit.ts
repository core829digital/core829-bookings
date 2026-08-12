import { RateLimiter, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

// Per-API-key quota used by the /v1 HTTP routes (Phase 3). Transactional,
// backed by the mounted @convex-dev/rate-limiter component — deliberately NOT
// an in-memory limiter, which resets on cold start and isn't shared across
// serverless instances.
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  apiKeyRequests: {
    kind: "token bucket",
    rate: 60, // 60 requests per minute per key
    period: MINUTE,
    capacity: 60,
  },
});