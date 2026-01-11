import crypto from "node:crypto";
import {
  db,
  playlists,
  playlistItems,
  playlistShareLinks,
  clips,
  segments,
} from "@kolla/db";
import { TRPCError } from "@trpc/server";
import { and, eq, max, desc, asc } from "drizzle-orm";
import { z } from "zod";
import {
  router,
  teamProcedure,
  coachProcedure,
  publicProcedure,
  protectedProcedure,
} from "../trpc";

export const playlistsRouter = router({
  // List all playlists for teams the user belongs to
  listAll: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.query.teamMemberships.findMany({
      where: (memberships, { eq }) => eq(memberships.userId, ctx.user.id),
    });

    const teamIds = memberships.map((m) => m.teamId);

    if (teamIds.length === 0) {
      return [];
    }

    const allPlaylists = await db.query.playlists.findMany({
      where: (playlists, { inArray }) => inArray(playlists.teamId, teamIds),
      with: {
        team: true,
        creator: true,
        items: true,
      },
      orderBy: (playlists, { desc }) => [desc(playlists.updatedAt)],
    });

    return allPlaylists;
  }),

  // List playlists for a specific team
  list: teamProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      return db.query.playlists.findMany({
        where: eq(playlists.teamId, input.teamId),
        with: {
          creator: true,
          items: true,
        },
        orderBy: (playlists, { desc }) => [desc(playlists.updatedAt)],
      });
    }),

  // Get single playlist with full item details
  get: teamProcedure
    .input(z.object({ teamId: z.number(), playlistId: z.number() }))
    .query(async ({ input }) => {
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
        with: {
          team: true,
          creator: true,
          items: {
            with: {
              clip: {
                with: {
                  event: true,
                  tags: true,
                  comments: true,
                },
              },
              segment: {
                with: {
                  clip: true,
                  event: true,
                  tags: true,
                  comments: true,
                },
              },
            },
            orderBy: (items) => [asc(items.position)],
          },
        },
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      return playlist;
    }),

  // Create a new playlist
  create: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().trim().min(1).max(255),
        description: z.string().trim().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [playlist] = await db
        .insert(playlists)
        .values({
          teamId: input.teamId,
          creatorId: ctx.user.id,
          name: input.name,
          description: input.description,
        })
        .returning();

      return playlist;
    }),

  // Update playlist details
  update: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        playlistId: z.number(),
        name: z.string().trim().min(1).max(255).optional(),
        description: z.string().trim().max(1000).nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      const updates: {
        name?: string;
        description?: string | null;
        updatedAt: Date;
      } = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;

      await db
        .update(playlists)
        .set(updates)
        .where(eq(playlists.id, input.playlistId));

      return { success: true };
    }),

  // Delete playlist
  delete: coachProcedure
    .input(z.object({ teamId: z.number(), playlistId: z.number() }))
    .mutation(async ({ input }) => {
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      await db.delete(playlists).where(eq(playlists.id, input.playlistId));
      return { success: true };
    }),

  // Add items to playlist
  addItems: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        playlistId: z.number(),
        items: z.array(
          z.object({
            type: z.enum(["clip", "segment"]),
            id: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify playlist belongs to team
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      // Get current max position
      const result = await db
        .select({ maxPosition: max(playlistItems.position) })
        .from(playlistItems)
        .where(eq(playlistItems.playlistId, input.playlistId));

      let nextPosition = (result[0]?.maxPosition ?? -1) + 1;

      // Validate and add each item
      for (const item of input.items) {
        if (item.type === "clip") {
          const clip = await db.query.clips.findFirst({
            where: and(eq(clips.id, item.id), eq(clips.teamId, input.teamId)),
          });
          if (!clip) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Clip ${item.id} not found in this team`,
            });
          }
          await db.insert(playlistItems).values({
            playlistId: input.playlistId,
            clipId: item.id,
            position: nextPosition++,
          });
        } else {
          const segment = await db.query.segments.findFirst({
            where: and(
              eq(segments.id, item.id),
              eq(segments.teamId, input.teamId),
            ),
          });
          if (!segment) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Segment ${item.id} not found in this team`,
            });
          }
          await db.insert(playlistItems).values({
            playlistId: input.playlistId,
            segmentId: item.id,
            position: nextPosition++,
          });
        }
      }

      // Update playlist updatedAt
      await db
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, input.playlistId));

      return { success: true, addedCount: input.items.length };
    }),

  // Remove item from playlist
  removeItem: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        playlistId: z.number(),
        itemId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      // Verify playlist belongs to team
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      await db
        .delete(playlistItems)
        .where(
          and(
            eq(playlistItems.id, input.itemId),
            eq(playlistItems.playlistId, input.playlistId),
          ),
        );

      // Update playlist updatedAt
      await db
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, input.playlistId));

      return { success: true };
    }),

  // Reorder items in playlist
  reorderItems: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        playlistId: z.number(),
        itemIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ input }) => {
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      // Update positions - first set to negative to avoid unique constraint conflicts
      for (let i = 0; i < input.itemIds.length; i++) {
        await db
          .update(playlistItems)
          .set({ position: -(i + 1) })
          .where(
            and(
              eq(playlistItems.id, input.itemIds[i]),
              eq(playlistItems.playlistId, input.playlistId),
            ),
          );
      }

      // Then set to actual positions
      for (let i = 0; i < input.itemIds.length; i++) {
        await db
          .update(playlistItems)
          .set({ position: i })
          .where(
            and(
              eq(playlistItems.id, input.itemIds[i]),
              eq(playlistItems.playlistId, input.playlistId),
            ),
          );
      }

      // Update playlist updatedAt
      await db
        .update(playlists)
        .set({ updatedAt: new Date() })
        .where(eq(playlists.id, input.playlistId));

      return { success: true };
    }),

  // Create share link
  createShareLink: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        playlistId: z.number(),
        expiresAt: z.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const playlist = await db.query.playlists.findFirst({
        where: and(
          eq(playlists.id, input.playlistId),
          eq(playlists.teamId, input.teamId),
        ),
      });

      if (!playlist) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Playlist not found" });
      }

      const token = crypto.randomBytes(16).toString("hex");

      const [shareLink] = await db
        .insert(playlistShareLinks)
        .values({
          playlistId: input.playlistId,
          teamId: input.teamId,
          token,
          expiresAt: input.expiresAt,
        })
        .returning();

      return shareLink;
    }),

  // Revoke share link
  revokeShareLink: coachProcedure
    .input(
      z.object({
        teamId: z.number(),
        shareLinkId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .delete(playlistShareLinks)
        .where(
          and(
            eq(playlistShareLinks.id, input.shareLinkId),
            eq(playlistShareLinks.teamId, input.teamId),
          ),
        );

      return { success: true };
    }),

  // List share links for playlist
  listShareLinks: teamProcedure
    .input(z.object({ teamId: z.number(), playlistId: z.number() }))
    .query(async ({ input }) => {
      return db.query.playlistShareLinks.findMany({
        where: and(
          eq(playlistShareLinks.playlistId, input.playlistId),
          eq(playlistShareLinks.teamId, input.teamId),
        ),
        orderBy: (links, { desc }) => [desc(links.createdAt)],
      });
    }),

  // Get playlist via public share token
  getViaToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const shareLink = await db.query.playlistShareLinks.findFirst({
        where: eq(playlistShareLinks.token, input.token),
        with: {
          playlist: {
            with: {
              team: true,
              items: {
                with: {
                  clip: {
                    with: {
                      event: true,
                      tags: true,
                    },
                  },
                  segment: {
                    with: {
                      clip: true,
                      event: true,
                      tags: true,
                    },
                  },
                },
                orderBy: (items) => [asc(items.position)],
              },
            },
          },
        },
      });

      if (!shareLink) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Share link not found",
        });
      }

      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Share link has expired",
        });
      }

      return {
        playlist: shareLink.playlist,
      };
    }),

  // Simple list for add-to-playlist dropdown
  listForAddDialog: teamProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      return db.query.playlists.findMany({
        where: eq(playlists.teamId, input.teamId),
        orderBy: (playlists, { desc }) => [desc(playlists.updatedAt)],
      });
    }),
});
