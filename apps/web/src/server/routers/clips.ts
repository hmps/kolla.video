import crypto from "node:crypto";
import { clipPlayers, clips, clipTags, db, events, segments } from "@kolla/db";
import { TRPCError } from "@trpc/server";
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
          comments: true,
        },
        orderBy: (clips, { asc }) => [asc(clips.index)],
      });
    }),

  // Returns clips pending approval (coach only)
  pendingByEvent: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.membership.role !== "coach") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can view pending clips",
        });
      }

      return db.query.clips.findMany({
        where: and(
          eq(clips.eventId, input.eventId),
          eq(clips.teamId, input.teamId),
          eq(clips.approvalStatus, "pending"),
        ),
        with: {
          uploader: true,
        },
        orderBy: (clips, { asc }) => [asc(clips.createdAt)],
      });
    }),

  // Approve pending clips (coach only) - supports single or multiple clips
  approve: teamProcedure
    .input(z.object({ teamId: z.number(), clipIds: z.array(z.number()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "coach") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can approve clips",
        });
      }

      // Verify all clips belong to the team
      for (const clipId of input.clipIds) {
        const clip = await db.query.clips.findFirst({
          where: and(eq(clips.id, clipId), eq(clips.teamId, input.teamId)),
        });

        if (!clip) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Clip ${clipId} not found`,
          });
        }
      }

      // Approve all clips
      for (const clipId of input.clipIds) {
        await db
          .update(clips)
          .set({ approvalStatus: "approved" })
          .where(eq(clips.id, clipId));
      }

      return { success: true, approvedCount: input.clipIds.length };
    }),

  // Reject a pending clip (coach only) - deletes the clip
  reject: teamProcedure
    .input(z.object({ teamId: z.number(), clipId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.membership.role !== "coach") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can reject clips",
        });
      }

      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clip not found",
        });
      }

      // Delete from storage
      try {
        await deleteFile(clip.storageKey);
        if (clip.hlsPrefix) {
          await deleteFile(`${clip.hlsPrefix}master.m3u8`);
        }
      } catch (error) {
        console.error("Error deleting files from storage:", error);
      }

      // Delete from database
      await db.delete(clips).where(eq(clips.id, input.clipId));

      return { success: true };
    }),

  // Returns unified list of clips and segments sorted by index
  mediaByEvent: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ input }) => {
      // Fetch clips (only approved ones)
      const clipsData = await db.query.clips.findMany({
        where: and(
          eq(clips.eventId, input.eventId),
          eq(clips.teamId, input.teamId),
          eq(clips.approvalStatus, "approved"),
        ),
        with: {
          tags: true,
          players: {
            with: {
              player: true,
            },
          },
          uploader: true,
          comments: true,
        },
      });

      // Fetch segments
      const segmentsData = await db.query.segments.findMany({
        where: and(
          eq(segments.eventId, input.eventId),
          eq(segments.teamId, input.teamId),
        ),
        with: {
          clip: true,
          tags: true,
          players: {
            with: {
              player: true,
            },
          },
          creator: true,
          comments: true,
        },
      });

      // Transform to unified type and sort by index
      const unified = [
        ...clipsData.map((c) => ({ ...c, type: "clip" as const })),
        ...segmentsData.map((s) => ({ ...s, type: "segment" as const })),
      ].sort((a, b) => a.index - b.index);

      return unified;
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

      // Submit to transcoding service
      const { transcodingService } = await import(
        "../../lib/transcoding/service"
      );
      await transcodingService.submitClip(input.clipId);

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
        with: {
          tags: true,
        },
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Get existing tags
      const existingTags = new Set(clip.tags.map((t) => t.tag));
      const newTags = new Set(input.tags);

      // Find tags to delete (in existing but not in new)
      const tagsToDelete = clip.tags.filter((t) => !newTags.has(t.tag));

      // Find tags to add (in new but not in existing)
      const tagsToAdd = input.tags.filter((tag) => !existingTags.has(tag));

      // Delete removed tags
      if (tagsToDelete.length > 0) {
        // Delete each tag individually
        for (const tag of tagsToDelete) {
          await db.delete(clipTags).where(eq(clipTags.id, tag.id));
        }
      }

      // Insert new tags
      if (tagsToAdd.length > 0) {
        await db
          .insert(clipTags)
          .values(tagsToAdd.map((tag) => ({ clipId: input.clipId, tag })));
      }

      return { success: true };
    }),

  deleteTag: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        clipId: z.number(),
        tagId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can delete tags");
      }

      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Delete the tag
      await db
        .delete(clipTags)
        .where(
          and(eq(clipTags.id, input.tagId), eq(clipTags.clipId, input.clipId)),
        );

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

  updateMetadata: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        clipId: z.number(),
        durationS: z.number().positive().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      console.log("[debug] input", input);
      // Verify clip belongs to team
      const clip = await db.query.clips.findFirst({
        where: and(eq(clips.id, input.clipId), eq(clips.teamId, input.teamId)),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Only update fields that are provided and not already set
      const updates: {
        durationS?: number;
        width?: number;
        height?: number;
      } = {};

      if (input.durationS !== undefined && clip.durationS === null) {
        updates.durationS = input.durationS;
      }
      if (input.width !== undefined && clip.width === null) {
        updates.width = input.width;
      }
      if (input.height !== undefined && clip.height === null) {
        updates.height = input.height;
      }

      // Only update if there are fields to update
      if (Object.keys(updates).length > 0) {
        await db.update(clips).set(updates).where(eq(clips.id, input.clipId));
      }

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
