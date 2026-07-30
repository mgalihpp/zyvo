# Redis Rate Limiting Integration Design

## Purpose
Implement Upstash Redis as a rate limiting layer to protect API endpoints (auth, CV operations, PDF export) in the Zyvo CV builder application. This provides security protection against abuse and prevents expensive operations like PDF generation.

## Target Scope
- `proxy.ts` (Next.js 16 proxy)
- `features/auth/server/auth-router.ts`
- `features/cv/server/cv-router.ts`

## Changes

### 1. Infrastructure: Redis Singleton
**File:** `lib/redis.ts`

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export { redis };
```

### 2. Rate Limiting Utility
**File:** `lib/rate-limit.ts`

```typescript
import { redis } from "./redis"; // singleton

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset?: number;
}

/**
 * Sliding window rate limiting using Redis sorted sets.
 * @param key Redis key (recommend per IP or per user)
 * @param limit Maximum requests allowed per window
 * @param windowMs Time window in milliseconds
 * @returns Rate limit check result
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  // Remove entries older than window
  await redis.zremrangebyscore(key, 0, windowStart);
  
  // Count current requests in window
  const currentCount = await redis.zcard(key);
  
  if (currentCount >= limit) {
    // Calculate when the oldest entry will expire
    const oldestTs = await redis.zrange(key, 0, 0);
    const resetTime = oldestTs ? Number(oldestTs[0]) + windowMs : now + windowMs;
    return { success: false, remaining: 0, reset: resetTime };
  }
  
  // Add current request
  await redis.zadd(key, { [now]: now });
  await redis.expire(key, Math.ceil(windowMs / 1000));
  
  const remaining = limit - currentCount - 1;
  return { success: true, remaining, reset: undefined };
}
```

### 3. Rate Limit Helper for Proxy
**File:** `lib/rate-limit-proxy.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, RateLimitResult } from "./rate-limit";

/**
 * Check rate limit and return 429 response if exceeded.
 * Returns null if allowed (caller continues).
 */
export async function checkRateLimit(
  request: NextRequest,
  limit: number,
  windowMs: number,
  keyPrefix: string
): Promise<NextResponse | null> {
  const ip = request.ip ?? "unknown";
  const key = `${keyPrefix}:${ip}`;
  
  const result = await rateLimit(key, limit, windowMs);
  
  if (!result.success) {
    const retryAfter = result.reset 
      ? Math.ceil((result.reset - Date.now()) / 1000) 
      : Math.ceil(windowMs / 1000);
    
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter },
      { 
        status: 429, 
        headers: { 
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Limit": limit.toString(),
        } 
      }
    );
  }
  
  // Add rate limit headers to continuing response (caller handles)
  return null;
}
```

### 4. Global Proxy Integration
**File:** `proxy.ts` (modify existing export function)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit-proxy";
import { getSessionCookie } from "better-auth/cookies";
import { isAuthPath, isProtectedPath, SIGN_IN_PATH } from "@/features/auth/lib/auth-routes";

export const proxy = async (request: NextRequest) => {
  // Global rate limiting middleware (100 requests per minute per IP)
  const rateLimitResponse = await checkRateLimit(request, 100, 60_000, "proxy");
  if (rateLimitResponse) return rateLimitResponse;
  
  const { pathname } = request.nextUrl;
  const hasSession = getSessionCookie(request) !== null;

  // Unauthenticated user hitting a protected route → send to sign in
  if (isProtectedPath(pathname) && !hasSession) {
    const url = new URL(SIGN_IN_PATH, request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting an auth route → send to the app
  if (isAuthPath(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
};
```

### 5. Auth API Route Integration
**File:** `app/api/auth/[...all]/route.ts` (wrap existing handler)

```typescript
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/features/auth/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-proxy";

const authHandler = toNextJsHandler(auth);

// Guard the POST handler with rate limiting for sign-in/sign-up
async function rateLimitedPost(request: Request) {
  const url = new URL(request.url);
  // Only rate-limit sign-in and sign-up (not session/verify etc.)
  if (url.pathname.endsWith("/sign-in") || url.pathname.endsWith("/sign-up")) {
    const rateLimitResponse = await checkRateLimit(
      request as Request, 
      5, 
      60_000, 
      "auth"
    );
    if (rateLimitResponse) return rateLimitResponse;
  }
  
  return authHandler.POST(request);
}

export const POST = process.env.UPSTASH_REDIS_REST_URL 
  ? rateLimitedPost 
  : authHandler.POST;
export const GET = authHandler.GET;
```

### 6. CV Router Integration (tRPC Middleware)
**File:** `server/trpc/trpc.ts` (add rate limit middleware)

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "@/server/trpc/context";
import { rateLimit } from "@/lib/rate-limit";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Helper to create rate limited procedures
function createRateLimitedProcedure(limit: number, windowMs: number, keyPrefix: string) {
  return t.procedure.use(async ({ ctx, next, type }) => {
    // Get IP from headers (or fallback)
    const ip = ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      ?? ctx.headers.get("x-real-ip") 
      ?? "unknown";
    const key = `${keyPrefix}:${ip}`;
    
    const result = await rateLimit(key, limit, windowMs);
    
    if (!result.success) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded",
        cause: { retryAfter: result.reset ? Math.ceil((result.reset - Date.now()) / 1000) : Math.ceil(windowMs / 1000) },
      });
    }
    
    return next({
      ctx: {
        ...ctx,
        rateLimitRemaining: result.remaining,
      },
    });
  });
}

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(function isAuthed(opts) {
  // ... existing auth middleware
});

// Rate limited procedures
export const rateLimitedMutation = createRateLimitedProcedure(10, 60_000, "cv:mutation");
export const rateLimitedPdfExport = createRateLimitedProcedure(5, 3_600_000, "cv:pdf");
```

**File:** `features/cv/server/cv-router.ts` (use rate limited procedures)

```typescript
import { router } from "@/server/trpc";
import { publicProcedure, rateLimitedMutation, rateLimitedPdfExport } from "@/server/trpc/trpc";

export const cvRouter = router({
  create: rateLimitedMutation
    .input(createCVSchema)
    .mutation(async ({ input, ctx }) => {
      // Original implementation...
    }),

  update: rateLimitedMutation
    .input(updateCVSchema)
    .mutation(async ({ input, ctx }) => {
      // Original implementation...
    }),

  delete: rateLimitedMutation
    .input(deleteCVSchema)
    .mutation(async ({ input, ctx }) => {
      // Original implementation...
    }),

  exportPdf: rateLimitedPdfExport
    .input(exportPdfSchema)
    .mutation(async ({ input, ctx }) => {
      // Original implementation...
    }),
});
```

## Error Responses

### 429 Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 30
}
```

Headers:
- `Retry-After`: Seconds until limit reset
- `X-RateLimit-Remaining`: Requests remaining in current window

### Logging
- Successful requests: `info` level with key, remaining, window
- Rate limit hits: `warn` level with IP/key, limit, window
- Redis errors: `error` level, fail open (request allowed)

## Configuration

### Environment Variables
```bash
UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### Rate Limit Settings
All limits apply per IP address by default. Adjust per route:
- Global (proxy): 100 req/min
- Auth endpoints (signin/signup): 5 req/min
- CV mutations (create/update/delete): 10 req/min
- PDF export: 5 req/hour

## Development & Testing

### Local Development
When Redis is unavailable (local dev), rate limiting is skipped:
```typescript
// lib/rate-limit.ts
const redisAvailable = await checkRedisHealth();
export async function rateLimit(...) {
  if (!redisAvailable) {
    return { success: true, remaining: -1 }; // fail open
  }
  // ... implementation
}
```

### Testing
- Unit test rate limit utility with mocked Redis
- Integration test with actual Upstash Redis instance
- Load testing for rate limit boundaries

## Security Considerations

1. **Key Design:** Rate limiting based on IP addresses helps prevent abuse but can be bypassed with proxies. Consider user-level limits for critical operations.

2. **Redis Security:** Ensure Redis URL/token is not committed to version control.

3. **Fallback Strategy:** Implementation fails open when Redis is unavailable to prevent service disruption.

4. **Error Handling:** Clear error messages with retry-after help clients implement proper retry strategies.

## Performance Impact

- Minimal CPU overhead (Redis operations are fast)
- Memory usage: Sorted sets with TTL for cleanup
- Cache: Redis connection reuse
- Network: Upstash provides global CDN with sub-ms latency

## Rollback Plan

If issues arise:
1. Remove rate limiting wrapper calls from target routes
2. Comment out Redis dependencies if breaking
3. Restore rate-limiting flag to "permissive" (allow all)

## Future Enhancements

1. Implement per-user rate limiting for authenticated operations
2. Add query-based rate limiting (different limits per endpoint)
3. Redis-based blacklisting for malicious IPs
4. Metrics dashboard for rate limit analytics

---

*Design created: 2026-07-30*
*Next step: Implementation plan*