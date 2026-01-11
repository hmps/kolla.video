import { protectedProcedure, router } from "../trpc";

export const authRouter = router({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),
});
