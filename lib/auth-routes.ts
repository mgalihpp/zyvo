/**
 * Route lists shared between `proxy.ts` (optimistic auth checks) and pages.
 * Keeping them here avoids drift between the proxy redirects and the server-side
 * verification done inside protected pages.
 */

/** Routes that require an authenticated session. Prefix match (covers nested paths). */
export const protectedRoutes = ["/builder"] as const;

/** Auth routes an already-signed-in user should be bounced away from. */
export const authRoutes = ["/signin", "/signup"] as const;

/** Where to send unauthenticated users hitting a protected route. */
export const SIGN_IN_PATH = "/signin";

/** Where to send authenticated users hitting an auth route. */
export const DEFAULT_AUTH_REDIRECT = "/builder";

export function isProtectedPath(pathname: string): boolean {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function isAuthPath(pathname: string): boolean {
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
