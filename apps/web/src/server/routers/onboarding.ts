import { db, onboardingProgress } from "@kolla/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const onboardingRouter = router({
  // Get all completed onboardings for the current user
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const progress = await db.query.onboardingProgress.findMany({
      where: eq(onboardingProgress.userId, ctx.user.id),
    });

    // Return as a map of key -> completedAt for easier lookups
    return progress.reduce(
      (acc, item) => {
        acc[item.key] = item.completedAt;
        return acc;
      },
      {} as Record<string, Date>,
    );
  }),

  // Mark an onboarding as complete
  markComplete: protectedProcedure
    .input(
      z.object({
        key: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if already completed
      const existing = await db.query.onboardingProgress.findFirst({
        where: and(
          eq(onboardingProgress.userId, ctx.user.id),
          eq(onboardingProgress.key, input.key),
        ),
      });

      if (existing) {
        return existing;
      }

      // Insert new completion
      const [newProgress] = await db
        .insert(onboardingProgress)
        .values({
          userId: ctx.user.id,
          key: input.key,
        })
        .returning();

      return newProgress;
    }),
});
