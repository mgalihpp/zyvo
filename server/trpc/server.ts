import "server-only";

import { headers } from "next/headers";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/lib/db";
import { appRouter } from "@/server/trpc/routers/_app";
import { createCallerFactory } from "@/server/trpc/trpc";

const createCaller = createCallerFactory(appRouter);

/**
 * Server-side tRPC caller for use in React Server Components.
 *
 * Resolves the Better Auth session from the incoming request headers (same as
 * the HTTP context) so protected procedures work when called directly during
 * server rendering — no network round-trip. Use this to prefetch data and hand
 * it to client `useQuery` calls as `initialData`.
 */
export async function getServerTrpc() {
  const session = await auth.api.getSession({ headers: await headers() });

  return createCaller({
    prisma,
    session,
    headers: await headers(),
  });
}
