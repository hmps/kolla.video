import { db, events } from "db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { router, teamProcedure } from "../trpc";

export const eventsRouter = router({
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
