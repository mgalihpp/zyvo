import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "@/features/auth/lib/auth";
import { prisma } from "@/lib/db";

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return {
    prisma,
    session,
    headers: opts.req.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
