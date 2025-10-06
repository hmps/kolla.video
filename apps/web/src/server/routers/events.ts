import { clips, db, events, teamMemberships } from "@kolla/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router, teamProcedure } from "../trpc";

export const eventsRouter = router({
  listAll: protectedProcedure.query(async ({ ctx }) => {
    // Get all teams the user is a member of
    const memberships = await db.query.teamMemberships.findMany({
      where: eq(teamMemberships.userId, ctx.user.id),
    });

    const teamIds = memberships.map((m) => m.teamId);

    if (teamIds.length === 0) {
      return [];
    }

    // Get all events from those teams with clip counts
    const allEvents = await db
      .select({
        id: events.id,
        teamId: events.teamId,
        type: events.type,
        title: events.title,
        date: events.date,
        venue: events.venue,
        notes: events.notes,
        createdAt: events.createdAt,
        clipCount: sql<number>`count(${clips.id})`.as("clip_count"),
      })
      .from(events)
      .leftJoin(clips, eq(clips.eventId, events.id))
      .where(inArray(events.teamId, teamIds))
      .groupBy(events.id)
      .orderBy(desc(events.date));

    return allEvents;
  }),

  list: teamProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      return db.query.events.findMany({
        where: eq(events.teamId, input.teamId),
        orderBy: [desc(events.date)],
      });
    }),

  get: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .query(async ({ input }) => {
      const event = await db.query.events.findFirst({
        where: and(
          eq(events.id, input.eventId),
          eq(events.teamId, input.teamId),
        ),
      });

      if (!event) {
        throw new Error("Event not found");
      }

      return event;
    }),

  create: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        type: z.enum(["game", "practice"]),
        title: z.string().min(1),
        date: z.coerce.date(),
        venue: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can create events");
      }

      const [event] = await db
        .insert(events)
        .values({
          teamId: input.teamId,
          type: input.type,
          title: input.title,
          date: input.date,
          venue: input.venue,
          notes: input.notes,
        })
        .returning();

      return event;
    }),

  update: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        eventId: z.number(),
        type: z.enum(["game", "practice"]).optional(),
        title: z.string().min(1).optional(),
        date: z.coerce.date().optional(),
        venue: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can update events");
      }

      const { teamId, eventId, ...updateData } = input;

      const [event] = await db
        .update(events)
        .set(updateData)
        .where(and(eq(events.id, eventId), eq(events.teamId, teamId)))
        .returning();

      return event;
    }),

  delete: teamProcedure
    .input(z.object({ teamId: z.number(), eventId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can delete events");
      }

      await db
        .delete(events)
        .where(
          and(eq(events.id, input.eventId), eq(events.teamId, input.teamId)),
        );

      return { success: true };
    }),
});
