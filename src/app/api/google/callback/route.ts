import { NextRequest, NextResponse } from "next/server";
import { fetchAction } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "../../../../../convex/_generated/api";

// Google redirects here after the user approves calendar access. This is a
// plain Next.js Route Handler (not a Convex http action) specifically so we
// can read the caller's own Convex Auth session cookie via
// convexAuthNextjsToken() and forward it — Convex http actions have no
// access to Next.js cookies, so there'd be no way to know *which* team
// member this OAuth flow belongs to otherwise.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const redirectUri = `${url.origin}/api/google/callback`;

  if (error) {
    return NextResponse.redirect(`${url.origin}/team?google=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${url.origin}/team?google=missing_code`);
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return NextResponse.redirect(`${url.origin}/signin`);
  }

  try {
    const result = await fetchAction(
      api.google.exchangeCodeAndConnect,
      { code, redirectUri },
      { token }
    );
    if (!result.ok) {
      return NextResponse.redirect(
        `${url.origin}/team?google=${encodeURIComponent(result.error ?? "unknown_error")}`
      );
    }
    return NextResponse.redirect(`${url.origin}/team?google=connected`);
  } catch {
    return NextResponse.redirect(`${url.origin}/team?google=exchange_failed`);
  }
}
