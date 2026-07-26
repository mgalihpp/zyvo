/**
 * Route lists shared between `proxy.ts` (optimistic auth checks) and pages.
 * Keeping them here avoids drift between the proxy redirects and the server-side
 * verification done inside protected pages.
 */

export const protectedRoutes = ["/builder"] as const;

export const authRoutes = ["/signin", "/signup"] as const;

export const SIGN_IN_PATH = "/signin";

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
