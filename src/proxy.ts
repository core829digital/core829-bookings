import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isTeamRoute = createRouteMatcher([
  "/calendar",
  "/calendar/(.*)",
  "/event-types",
  "/event-types/(.*)",
  "/availability",
  "/organizations",
  "/team",
]);
const isSignInPage = createRouteMatcher(["/signin"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/calendar");
  }
  if (isTeamRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/signin");
  }
});

export const config = {
  // /api/google/callback is deliberately excluded: it's the landing page of
  // a cross-site redirect back from Google's OAuth consent screen, and
  // running Convex Auth's session-refresh logic on that specific request
  // was clearing the session cookie and signing the team member out instead
  // of just connecting Google Calendar. The route handler itself reads the
  // session directly via convexAuthNextjsToken() without needing the
  // middleware's refresh step, so nothing is lost by skipping it here.
  matcher: [
    "/((?!.*\\..*|_next|api/google).*)",
    "/",
    "/((?!api/google)(?:api|trpc))(.*)",
  ],
};
