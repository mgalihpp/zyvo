import { z } from "zod";
import { auth } from "@/features/auth/lib/auth";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

export const authRouter = createTRPCRouter({
  /**
   * Sets a password for the current user. `setPassword` is server-only in
   * Better Auth, so it can't be called from the client directly.
   */
  setPassword: protectedProcedure
    .input(z.object({ newPassword: z.string().min(8) }))
    .mutation(({ ctx, input }) =>
      auth.api.setPassword({
        body: { newPassword: input.newPassword },
        headers: ctx.headers,
      }),
    ),
});
