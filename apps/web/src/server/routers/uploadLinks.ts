import crypto from "node:crypto";
import { clips, db, events, uploadLinks } from "@kolla/db";
import { TRPCError } from "@trpc/server";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { getPresignedUploadUrl } from "../../lib/storage";
import { publicProcedure, router, teamProcedure } from "../trpc";

const DURATION_DAYS = {
  "1": 1,
  "3": 3,
  "7": 7,
  "30": 30,
} as const;

// Helper to validate token and check expiration
async function validateToken(token: string) {
  const uploadLink = await db.query.uploadLinks.findFirst({
    where: eq(uploadLinks.token, token),
    with: {
      event: true,
      team: true,
    },
  });

  if (!uploadLink) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Upload link not found",
    });
  }

  if (uploadLink.expiresAt < new Date()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This upload link has expired",
    });
  }

  return uploadLink;
}

export const uploadLinksRouter = router({
  // Coach-only: Create an upload link
  create: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        eventId: z.number(),
        durationDays: z.enum(["1", "3", "7", "30"]).default("1"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can create upload links",
        });
      }

      // Verify event belongs to team
      const event = await db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.teamId, input.teamId),
        ),
      });

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Generate random token (32 chars hex)
      const token = crypto.randomBytes(16).toString("hex");

      // Calculate expiration
      const durationMs =
        DURATION_DAYS[input.durationDays] * 24 * 60 * 60 * 1000;
      const expiresAt = new Date(Date.now() + durationMs);

      const [uploadLink] = await db
        .insert(uploadLinks)
        .values({
          teamId: input.teamId,
          eventId: input.eventId,
          token,
          expiresAt,
          createdById: ctx.user.id,
        })
        .returning();

      return uploadLink;
    }),

  // Team member: List upload links for an event
  listByEvent: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ input }) => {
      return db.query.uploadLinks.findMany({
        where: and(
          eq(uploadLinks.eventId, input.eventId),
          eq(uploadLinks.teamId, input.teamId),
        ),
        with: {
          createdBy: true,
        },
        orderBy: (uploadLinks, { desc }) => [desc(uploadLinks.createdAt)],
      });
    }),

  // Coach-only: Revoke an upload link
  revoke: teamProcedure
    .input(z.object({ teamId: z.number(), uploadLinkId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only coaches can revoke upload links",
        });
      }

      await db
        .delete(uploadLinks)
        .where(
          and(
            eq(uploadLinks.id, input.uploadLinkId),
            eq(uploadLinks.teamId, input.teamId),
          ),
        );

      return { success: true };
    }),

  // PUBLIC: Validate token and get event info
  getViaToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const uploadLink = await validateToken(input.token);

      return {
        event: {
          id: uploadLink.event.id,
          title: uploadLink.event.title,
          date: uploadLink.event.date,
          type: uploadLink.event.type,
        },
        team: {
          id: uploadLink.team.id,
          name: uploadLink.team.name,
        },
        expiresAt: uploadLink.expiresAt,
      };
    }),

  // PUBLIC: Get next clip index for upload
  getNextIndex: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const uploadLink = await validateToken(input.token);

      // Get the max index for this event
      const result = await db
        .select({ maxIndex: max(clips.index) })
        .from(clips)
        .where(eq(clips.eventId, uploadLink.eventId));

      const nextIndex = (result[0]?.maxIndex ?? 0) + 1;

      return { nextIndex };
    }),

  // PUBLIC: Get presigned URL for upload
  presignUpload: publicProcedure
    .input(
      z.object({
        token: z.string(),
        uploaderName: z.string().trim().min(1).max(100),
        index: z.number(),
        contentType: z.string(),
        size: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const uploadLink = await validateToken(input.token);

      const uuid = crypto.randomUUID();
      const key = `originals/${uploadLink.teamId}/${uploadLink.eventId}/${uuid}.mp4`;

      // Create clip row with uploaderName (no uploaderId for public uploads)
      // Public uploads require approval before appearing in the event
      const [clip] = await db
        .insert(clips)
        .values({
          teamId: uploadLink.teamId,
          eventId: uploadLink.eventId,
          uploaderName: input.uploaderName,
          index: input.index,
          storageKey: key,
          status: "uploaded",
          approvalStatus: "pending",
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

  // PUBLIC: Confirm upload completed
  confirmUpload: publicProcedure
    .input(
      z.object({
        token: z.string(),
        clipId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const uploadLink = await validateToken(input.token);

      // Verify clip belongs to the event from this token
      const clip = await db.query.clips.findFirst({
        where: and(
          eq(clips.id, input.clipId),
          eq(clips.eventId, uploadLink.eventId),
        ),
      });

      if (!clip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clip not found",
        });
      }

      // Update status to uploaded
      await db
        .update(clips)
        .set({ status: "uploaded" })
        .where(eq(clips.id, input.clipId));

      return { success: true };
    }),

  // PUBLIC: Enqueue for processing
  enqueueProcessing: publicProcedure
    .input(
      z.object({
        token: z.string(),
        clipId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const uploadLink = await validateToken(input.token);

      // Verify clip belongs to the event from this token
      const clip = await db.query.clips.findFirst({
        where: and(
          eq(clips.id, input.clipId),
          eq(clips.eventId, uploadLink.eventId),
        ),
      });

      if (!clip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clip not found",
        });
      }

      // Submit to transcoding service (it handles status updates internally)
      // If transcoding fails, the clip remains in "uploaded" status
      try {
        const { transcodingService } = await import(
          "../../lib/transcoding/service"
        );
        await transcodingService.submitClip(input.clipId);
      } catch (error) {
        console.error("Transcoding submission failed:", error);
        // Don't throw - let the upload succeed, clip stays in "uploaded" status
      }

      return { success: true };
    }),
});
