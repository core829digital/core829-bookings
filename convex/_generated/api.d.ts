/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as availability from "../availability.js";
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as eventTypes from "../eventTypes.js";
import type * as http from "../http.js";
import type * as internal_bookings from "../internal/bookings.js";
import type * as lib_apiKeys from "../lib/apiKeys.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_slotEngine from "../lib/slotEngine.js";
import type * as organizations from "../organizations.js";
import type * as reminders from "../reminders.js";
import type * as seed from "../seed.js";
import type * as slots from "../slots.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authz: typeof authz;
  availability: typeof availability;
  bookings: typeof bookings;
  crons: typeof crons;
  emails: typeof emails;
  eventTypes: typeof eventTypes;
  http: typeof http;
  "internal/bookings": typeof internal_bookings;
  "lib/apiKeys": typeof lib_apiKeys;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/slotEngine": typeof lib_slotEngine;
  organizations: typeof organizations;
  reminders: typeof reminders;
  seed: typeof seed;
  slots: typeof slots;
  users: typeof users;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
