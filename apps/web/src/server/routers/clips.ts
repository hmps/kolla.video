import crypto from "node:crypto";
import { clipPlayers, clips, clipTags, db, events } from "@kolla/db";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { deleteFile, getPresignedUploadUrl } from "../../lib/storage";
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
        orderBy: (clips, { asc }) => [asc(clips.index)],
      });
    }),

  getNextIndex: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ input }) => {
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

      // Get the max index for this event
      const result = await db
        .select({ maxIndex: max(clips.index) })
        .from(clips)
        .where(eq(clips.eventId, input.eventId));

      const nextIndex = (result[0]?.maxIndex ?? 0) + 1;

      return { nextIndex };
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
        index: z.number(),
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

      // Create clip row with status 'uploaded' and the provided index
      const [clip] = await db
        .insert(clips)
        .values({
          teamId: input.teamId,
          eventId: input.eventId,
          uploaderId: ctx.user.id,
          index: input.index,
          storageKey: key,
          status: "uploaded",
        })
        .returning();

      // Generate presigned PUT URL for R2
      const presignedUrl = await getPresignedUploadUrl({ key });

      return {
        clipId: clip.id,
        key,
        presignedUrl,
      };
    }),

  confirmUpload: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can upload clips");
      }

      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Update status to uploaded
      await db
        .update(clips)
        .set({ status: "uploaded" })
        .where(eq(clips.id, input.clipId));

      return { success: true };
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
        tags: z.array(z.string().trim().min(1)),
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

  updateName: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        clipId: z.number(),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can update clip names");
      }

      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Update the clip name
      await db
        .update(clips)
        .set({ name: input.name })
        .where(eq(clips.id, input.clipId));

      return { success: true };
    }),

  delete: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can delete clips");
      }

      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Delete from R2 storage
      try {
        // Delete the original file
        await deleteFile(clip.storageKey);

        // Delete HLS files if they exist
        if (clip.hlsPrefix) {
          // Note: This deletes the master.m3u8 file
          // In production, you may want to recursively delete all HLS segments
          await deleteFile(`${clip.hlsPrefix}master.m3u8`);
        }
      } catch (error) {
        console.error("Error deleting files from storage:", error);
        // Continue with database deletion even if storage deletion fails
      }

      // Delete the clip from database (cascading deletes will handle related records)
      await db.delete(clips).where(eq(clips.id, input.clipId));

      return { success: true };
    }),
});
