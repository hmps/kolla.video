import crypto from "node:crypto";
import { and, db, eq, events, shareLinks } from "@kolla/db";
import { z } from "zod";
import { publicProcedure, router, teamProcedure } from "../trpc";

export const sharesRouter = router({
  createEventLink: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        eventId: z.number(),
        expiresAt: z.date().optional(),
        allowPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can create share links");
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

      // Generate random token
      const token = crypto.randomBytes(16).toString("hex");

      const [shareLink] = await db
        .insert(shareLinks)
        .values({
          teamId: input.teamId,
          eventId: input.eventId,
          token,
          expiresAt: input.expiresAt,
          allowPublic: input.allowPublic ?? false,
        })
        .returning();

      return shareLink;
    }),

  revoke: teamProcedure
    .input(z.object({ teamId: z.number(), shareLinkId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can revoke share links");
      }

      await db
        .delete(shareLinks)
        .where(
          and(
            eq(shareLinks.id, input.shareLinkId),
            eq(shareLinks.teamId, input.teamId),
          ),
        );

      return { success: true };
    }),

  getViaToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const shareLink = await db.query.shareLinks.findFirst({
        where: eq(shareLinks.token, input.token),
        with: {
          event: {
            with: {
              clips: {
                with: {
                  tags: true,
                  players: {
                    with: {
                      player: true,
                    },
                  },
                },
              },
              segments: {
                with: {
                  clip: true,
                  tags: true,
                  players: {
                    with: {
                      player: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!shareLink) {
        throw new Error("Share link not found");
      }

      // Check if expired
      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        throw new Error("Share link has expired");
      }

      return {
        event: shareLink.event,
        allowPublic: shareLink.allowPublic,
      };
    }),

  listByEvent: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ input }) => {
      return db.query.shareLinks.findMany({
        where: and(
          eq(shareLinks.eventId, input.eventId),
          eq(shareLinks.teamId, input.teamId),
        ),
        orderBy: (shareLinks, { desc }) => [desc(shareLinks.createdAt)],
      });
    }),
});
