import { and, db, eq, players } from "@kolla/db";
import { z } from "zod";
import { router, teamProcedure } from "../trpc";

export const playersRouter = router({
  list: teamProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      return db.query.players.findMany({
        where: eq(players.teamId, input.teamId),
        orderBy: (players, { asc }) => [asc(players.number)],
      });
    }),

  create: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        name: z.string().min(1),
        number: z.number().optional(),
        externalId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can create players");
      }

      const [player] = await db
        .insert(players)
        .values({
          teamId: input.teamId,
          name: input.name,
          number: input.number,
          externalId: input.externalId,
        })
        .returning();

      return player;
    }),

  update: teamProcedure
    .input(
      z.object({
        teamId: z.number(),
        playerId: z.number(),
        name: z.string().min(1).optional(),
        number: z.number().optional(),
        externalId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can update players");
      }

      const { teamId, playerId, ...updateData } = input;

      const [player] = await db
        .update(players)
        .set(updateData)
        .where(and(eq(players.id, playerId), eq(players.teamId, teamId)))
        .returning();

      return player;
    }),

  delete: teamProcedure
    .input(z.object({ teamId: z.number(), playerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify user is a coach
      if (ctx.membership.role !== "coach") {
        throw new Error("Only coaches can delete players");
      }

      await db
        .delete(players)
        .where(
          and(eq(players.id, input.playerId), eq(players.teamId, input.teamId)),
        );

      return { success: true };
    }),
});
