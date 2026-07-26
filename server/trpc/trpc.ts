import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "@/server/trpc/context";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(function isAuthed(opts) {
  const { session } = opts.ctx;

  if (!session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      session: { ...session, user: session.user },
    },
  });
});
