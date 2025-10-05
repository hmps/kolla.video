import crypto from "node:crypto";
import { clipPlayers, clips, clipTags, db, events } from "db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { router, teamProcedure } from "../trpc";

export const clipsRouter = router({
  byEvent: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ input }) => {
      return db.query.clips.findMany({
        where: and(
          eq(clips.eventId, input.eventId),
          eq(clips.teamId, input.teamId),
        ),
        with: {
          tags: true,
          players: {
            with: {
              player: true,
            },
          },
          uploader: true,
        },
        orderBy: (clips, { desc }) => [desc(clips.createdAt)],
      });
    }),

  get: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .query(async ({ input }) => {
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
        with: {
          tags: true,
          players: {
            with: {
              player: true,
            },
          },
          uploader: true,
        },
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      return clip;
    }),

  presignUpload: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        eventId: z.number(),
        contentType: z.string(),
        size: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can upload clips");
      }

      // Verify event belongs to team
      const event = await db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.teamId, input.teamId),
        ),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      const uuid = crypto.randomUUID();
      const key = `originals/${input.teamId}/${input.eventId}/${uuid}.mp4`;

      // Create clip row with status 'uploaded'
      const [clip] = await db
        .insert(clips)
        .values({
          teamId: input.teamId,
          eventId: input.eventId,
          uploaderId: ctx.user.id,
          storageKey: key,
          status: "uploaded",
        })
        .returning();

      // TODO: Generate presigned POST for R2
      // For now, return placeholder
      return {
        clipId: clip.id,
        key,
        presignedPost: {
          url: process.env.S3_ENDPOINT || "",
          fields: {},
        },
      };
    }),

  enqueueProcessing: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can process clips");
      }

      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Update status to processing
      await db
        .update(clips)
        .set({ status: "processing" })
        .where(eq(clips.id, input.clipId));

      // TODO: Post job to worker
      // For now, just return success
      return { success: true };
    }),

  setTags: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        clipId: z.number(),
        tags: z.array(z.enum(["offense", "defense"])),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can set tags");
      }

      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Delete existing tags
      await db.delete(clipTags).where(eq(clipTags.clipId, input.clipId));

      // Insert new tags
      if (input.tags.length > 0) {
        await db
          .insert(clipTags)
          .values(input.tags.map((tag) => ({ clipId: input.clipId, tag })));
      }

      return { success: true };
    }),

  setPlayers: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        clipId: z.number(),
        playerIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can set players");
      }

      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Delete existing player associations
      await db.delete(clipPlayers).where(eq(clipPlayers.clipId, input.clipId));

      // Insert new player associations
      if (input.playerIds.length > 0) {
        await db.insert(clipPlayers).values(
          input.playerIds.map((playerId) => ({
            clipId: input.clipId,
            playerId,
          })),
        );
      }

      return { success: true };
    }),
});
