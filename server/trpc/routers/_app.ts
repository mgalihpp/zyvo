import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";
import { cvRouter } from "./cv";

export const appRouter = createTRPCRouter({
  /** Health check — available without authentication. */
  health: publicProcedure.query(() => {
    return { status: "ok" as const, timestamp: Date.now() };
  }),

  /** Returns the currently authenticated user. Requires a valid session. */
  me: protectedProcedure.query(({ ctx }) => {
    return ctx.session.user;
  }),

  cv: cvRouter,
});

export type AppRouter = typeof appRouter;
