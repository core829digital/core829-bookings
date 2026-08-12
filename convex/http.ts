import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Phase 3 will add the versioned public API here: /v1/event-types,
// /v1/event-types/:slug/slots, /v1/bookings, etc. — authenticated by
// API key, not Convex Auth. Do not add those routes before Phase 1
// (single-host booking mechanic) works end-to-end.

export default http;
