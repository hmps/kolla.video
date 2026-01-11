import {
  and,
  clips,
  comments,
  db,
  eq,
  or,
  segmentComments,
  segments,
  teamMemberships,
} from "@kolla/db";
import { z } from "zod";
import { router, teamProcedure } from "../trpc";

export const commentsRouter = router({
  playerUsers: teamProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      // Get all team members with role "player"
      const playerMembers = await db.query.teamMemberships.findMany({
        where: and(
          eq(teamMemberships.teamId, input.teamId),
          eq(teamMemberships.role, "player"),
        ),
        with: {
          user: true,
        },
      });

      return playerMembers.map((m) => ({
        id: m.user.id,
        name:
          `${m.user.firstName || ""} ${m.user.lastName || ""}`.trim() ||
          m.user.email,
        email: m.user.email,
      }));
    }),

  byClip: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      const isCoach = ctx.membership.role === "coach";

      // Build visibility filter based on user role
      const visibilityFilter = isCoach
        ? or(
            eq(comments.level, "all"),
            eq(comments.level, "coaches"),
            eq(comments.level, "private"),
          )
        : or(
            eq(comments.level, "all"),
            and(
              eq(comments.level, "private"),
              eq(comments.targetUserId, ctx.user.id),
            ),
          );

      return db.query.comments.findMany({
        where: and(eq(comments.clipId, input.clipId), visibilityFilter),
        with: {
          author: true,
          targetUser: true,
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
        level: z.enum(["all", "coaches", "private"]).default("coaches"),
        targetUserId: z.string().optional(),
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

      // Validate private comments have a target user
      if (input.level === "private" && !input.targetUserId) {
        throw new Error("Private comments must have a target user");
      }

      const [comment] = await db
        .insert(comments)
        .values({
          clipId: input.clipId,
          authorId: ctx.user.id,
          body: input.body,
          level: input.level,
          targetUserId: input.targetUserId,
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

  // Segment comment endpoints
  bySegment: teamProcedure
    .input(z.object({ teamId: z.number(), segmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify segment belongs to team
      const segment = await db.query.segments.findFirst({
        where: and(
          eq(segments.id, input.segmentId),
          eq(segments.teamId, input.teamId),
        ),
      });

      if (!segment) {
        throw new Error("Segment not found");
      }

      const isCoach = ctx.membership.role === "coach";

      // Build visibility filter based on user role
      const visibilityFilter = isCoach
        ? or(
            eq(segmentComments.level, "all"),
            eq(segmentComments.level, "coaches"),
            eq(segmentComments.level, "private"),
          )
        : or(
            eq(segmentComments.level, "all"),
            and(
              eq(segmentComments.level, "private"),
              eq(segmentComments.targetUserId, ctx.user.id),
            ),
          );

      return db.query.segmentComments.findMany({
        where: and(
          eq(segmentComments.segmentId, input.segmentId),
          visibilityFilter,
        ),
        with: {
          author: true,
          targetUser: true,
        },
        orderBy: (segmentComments, { asc }) => [asc(segmentComments.createdAt)],
      });
    }),

  addToSegment: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        segmentId: z.number(),
        body: z.string().min(1),
        level: z.enum(["all", "coaches", "private"]).default("coaches"),
        targetUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can add comments");
      }

      // Verify segment belongs to team
      const segment = await db.query.segments.findFirst({
        where: and(
          eq(segments.id, input.segmentId),
          eq(segments.teamId, input.teamId),
        ),
      });

      if (!segment) {
        throw new Error("Segment not found");
      }

      // Validate private comments have a target user
      if (input.level === "private" && !input.targetUserId) {
        throw new Error("Private comments must have a target user");
      }

      const [comment] = await db
        .insert(segmentComments)
        .values({
          segmentId: input.segmentId,
          authorId: ctx.user.id,
          body: input.body,
          level: input.level,
          targetUserId: input.targetUserId,
        })
        .returning();

      return comment;
    }),

  deleteSegmentComment: teamProcedure
    .input(z.object({ teamId: z.number(), commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach and owns the comment
      const comment = await db.query.segmentComments.findFirst({
        where: eq(segmentComments.id, input.commentId),
        with: {
          segment: true,
        },
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (comment.segment.teamId !== input.teamId) {
        throw new Error("Comment not found");
      }

      if (ctx.membership.role !== "coach" || comment.authorId !== ctx.user.id) {
        throw new Error("Only the comment author can delete it");
      }

      await db
        .delete(segmentComments)
        .where(eq(segmentComments.id, input.commentId));

      return { success: true };
    }),
});
