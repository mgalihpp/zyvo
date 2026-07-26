import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_AUTH_REDIRECT,
  isAuthPath,
  isProtectedPath,
  SIGN_IN_PATH,
} from "@/lib/auth-routes";

/**
 * Proxy (Next.js 16's renamed Middleware) runs on every matched request.
 *
 * This is an *optimistic* auth check: it only reads the session cookie's
 * presence — no database call — as recommended for Proxy. It's the first line
 * of defense for redirects; the real session verification happens server-side
 * inside protected pages (see `app/(auth)/builder/page.tsx`).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = getSessionCookie(request) !== null;

  // Unauthenticated user hitting a protected route → send to sign in,
  // preserving where they were headed so we can bounce back after login.
  if (isProtectedPath(pathname) && !hasSession) {
    const url = new URL(SIGN_IN_PATH, request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting an auth route → send to the app.
  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL(DEFAULT_AUTH_REDIRECT, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
