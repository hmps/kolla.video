import {
  clips,
  db,
  events,
  segmentPlayers,
  segments,
  segmentTags,
} from "@kolla/db";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { coachProcedure, router, teamProcedure } from "../trpc";

export const segmentsRouter = router({
  // Get a single segment
  get: teamProcedure
    .input(z.object({ teamId: z.number(), segmentId: z.number() }))
    .query(async ({ input }) => {
      const segment = await db.query.segments.findFirst({
        where: and(
          eq(segments.id, input.segmentId),
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

      if (!segment) {
        throw new Error("Segment not found");
      }

      return segment;
    }),

  // Create a new segment
  create: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        eventId: z.number(),
        clipId: z.number(),
        name: z.string().trim().max(255).optional(),
        startS: z.number().nonnegative(),
        endS: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate endS > startS
      if (input.endS <= input.startS) {
        throw new Error("End time must be after start time");
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

      // Verify clip belongs to team and event
      const clip = await db.query.clips.findFirst({
        where: and(
          eq(clips.id, input.clipId),
          eq(clips.teamId, input.teamId),
          eq(clips.eventId, input.eventId),
        ),
      });

      if (!clip) {
        throw new Error("Clip not found");
      }

      // Validate times are within clip duration (if known)
      if (clip.durationS !== null) {
        if (input.startS >= clip.durationS || input.endS > clip.durationS) {
          throw new Error("Segment times must be within clip duration");
        }
      }

      // Get the max index for this event (across both clips and segments)
      const [clipMaxResult, segmentMaxResult] = await Promise.all([
        db
          .select({ maxIndex: max(clips.index) })
          .from(clips)
          .where(eq(clips.eventId, input.eventId)),
        db
          .select({ maxIndex: max(segments.index) })
          .from(segments)
          .where(eq(segments.eventId, input.eventId)),
      ]);

      const clipMaxIndex = clipMaxResult[0]?.maxIndex ?? 0;
      const segmentMaxIndex = segmentMaxResult[0]?.maxIndex ?? 0;
      const nextIndex = Math.max(clipMaxIndex, segmentMaxIndex) + 1;

      // Create the segment
      const [segment] = await db
        .insert(segments)
        .values({
          teamId: input.teamId,
          eventId: input.eventId,
          clipId: input.clipId,
          creatorId: ctx.user.id,
          index: nextIndex,
          name: input.name ?? null,
          startS: input.startS,
          endS: input.endS,
        })
        .returning();

      return segment;
    }),

  // Update segment times or name
  update: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        segmentId: z.number(),
        name: z.string().trim().max(255).optional(),
        startS: z.number().nonnegative().optional(),
        endS: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify segment belongs to team
      const segment = await db.query.segments.findFirst({
        where: and(
          eq(segments.id, input.segmentId),
          eq(segments.teamId, input.teamId),
        ),
        with: {
          clip: true,
        },
      });

      if (!segment) {
        throw new Error("Segment not found");
      }

      // Compute final values
      const startS = input.startS ?? segment.startS;
      const endS = input.endS ?? segment.endS;

      // Validate endS > startS
      if (endS <= startS) {
        throw new Error("End time must be after start time");
      }

      // Validate times are within clip duration (if known)
      if (segment.clip.durationS !== null) {
        if (startS >= segment.clip.durationS || endS > segment.clip.durationS) {
          throw new Error("Segment times must be within clip duration");
        }
      }

      // Build updates object
      const updates: {
        name?: string | null;
        startS?: number;
        endS?: number;
      } = {};

      if (input.name !== undefined) {
        updates.name = input.name || null;
      }
      if (input.startS !== undefined) {
        updates.startS = input.startS;
      }
      if (input.endS !== undefined) {
        updates.endS = input.endS;
      }

      if (Object.keys(updates).length > 0) {
        await db
          .update(segments)
          .set(updates)
          .where(eq(segments.id, input.segmentId));
      }

      return { success: true };
    }),

  // Delete a segment
  delete: coachProcedure
    .input(z.object({ teamId: z.number(), segmentId: z.number() }))
    .mutation(async ({ input }) => {
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

      // Delete the segment (cascade will handle tags, players, comments)
      await db.delete(segments).where(eq(segments.id, input.segmentId));

      return { success: true };
    }),

  // Set tags for a segment
  setTags: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        segmentId: z.number(),
        tags: z.array(z.string().trim().min(1)),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify segment belongs to team
      const segment = await db.query.segments.findFirst({
        where: and(
          eq(segments.id, input.segmentId),
          eq(segments.teamId, input.teamId),
        ),
        with: {
          tags: true,
        },
      });

      if (!segment) {
        throw new Error("Segment not found");
      }

      // Get existing tags
      const existingTags = new Set(segment.tags.map((t) => t.tag));
      const newTags = new Set(input.tags);

      // Find tags to delete (in existing but not in new)
      const tagsToDelete = segment.tags.filter((t) => !newTags.has(t.tag));

      // Find tags to add (in new but not in existing)
      const tagsToAdd = input.tags.filter((tag) => !existingTags.has(tag));

      // Delete removed tags
      if (tagsToDelete.length > 0) {
        for (const tag of tagsToDelete) {
          await db.delete(segmentTags).where(eq(segmentTags.id, tag.id));
        }
      }

      // Insert new tags
      if (tagsToAdd.length > 0) {
        await db.insert(segmentTags).values(
          tagsToAdd.map((tag) => ({
            segmentId: input.segmentId,
            tag,
          })),
        );
      }

      return { success: true };
    }),

  // Delete a single tag
  deleteTag: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        segmentId: z.number(),
        tagId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
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

      // Delete the tag
      await db
        .delete(segmentTags)
        .where(
          and(
            eq(segmentTags.id, input.tagId),
            eq(segmentTags.segmentId, input.segmentId),
          ),
        );

      return { success: true };
    }),

  // Set players for a segment
  setPlayers: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        segmentId: z.number(),
        playerIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ input }) => {
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

      // Delete existing player associations
      await db
        .delete(segmentPlayers)
        .where(eq(segmentPlayers.segmentId, input.segmentId));

      // Insert new player associations
      if (input.playerIds.length > 0) {
        await db.insert(segmentPlayers).values(
          input.playerIds.map((playerId) => ({
            segmentId: input.segmentId,
            playerId,
          })),
        );
      }

      return { success: true };
    }),

  // Update segment name
  updateName: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        segmentId: z.number(),
        name: z.string().trim().min(1).max(255),
      }),
    )
    .mutation(async ({ input }) => {
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

      // Update the segment name
      await db
        .update(segments)
        .set({ name: input.name })
        .where(eq(segments.id, input.segmentId));

      return { success: true };
    }),
});
