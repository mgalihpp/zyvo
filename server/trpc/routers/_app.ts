import { aiRouter } from "@/features/ai/server/ai-router";
import { authRouter } from "@/features/auth/server/auth-router";
import { billingRouter } from "@/features/billing/server/billing-router";
import { cvRouter } from "@/features/cv/server/cv-router";
import { jobTrackerRouter } from "@/features/job-tracker/server/job-tracker-router";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/trpc/trpc";

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
  account: authRouter,
  billing: billingRouter,
  ai: aiRouter,
  jobTracker: jobTrackerRouter,
});

export type AppRouter = typeof appRouter;
