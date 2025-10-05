import { clips, comments, db } from "db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { router, teamProcedure } from "../trpc";

export const commentsRouter = router({
  byClip: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .query(async ({ input }) => {
      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      return db.query.comments.findMany({
        where: eq(comments.clipId, input.clipId),
        with: {
          author: true,
        },
        orderBy: (comments, { asc }) => [asc(comments.createdAt)],
      });
    }),

  add: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        clipId: z.number(),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can add comments");
      }

      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      const [comment] = await db
        .insert(comments)
        .values({
          clipId: input.clipId,
          authorId: ctx.user.id,
          body: input.body,
        })
        .returning();

      return comment;
    }),

  delete: teamProcedure
    .input(z.object({ teamId: z.number(), commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach and owns the comment
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, input.commentId),
        with: {
          clip: true,
        },
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (comment.clip.teamId !== input.teamId) {
        throw new Error("Comment not found");
      }

      if (ctx.membership.role !== "coach" || comment.authorId !== ctx.user.id) {
        throw new Error("Only the comment author can delete it");
      }

      await db.delete(comments).where(eq(comments.id, input.commentId));

      return { success: true };
    }),
});
