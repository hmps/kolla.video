import { db, teamMemberships, teams, users } from "db";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const teamsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.query.teamMemberships.findMany({
      where: eq(teamMemberships.userId, ctx.user.id),
      with: {
        team: true,
      },
    });

    const teamsWithCounts = await Promise.all(
      memberships.map(async (m) => {
        const [{ count: memberCount }] = await db
          .select({ count: count() })
          .from(teamMemberships)
          .where(eq(teamMemberships.teamId, m.team.id));

        return {
          ...m.team,
          role: m.role,
          memberCount,
        };
      }),
    );

    return teamsWithCounts;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [team] = await db
        .insert(teams)
        .values({
          name: input.name,
        })
        .returning();

      // Add creator as coach
      await db.insert(teamMemberships).values({
        teamId: team.id,
        userId: ctx.user.id,
        role: "coach",
      });

      return team;
    }),

  get: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ ctx, input }) => {
      const membership = await db.query.teamMemberships.findFirst({
        where: (memberships, { and, eq }) =>
          and(
            eq(memberships.teamId, input.teamId),
            eq(memberships.userId, ctx.user.id),
          ),
        with: {
          team: true,
        },
      });

      if (!membership) {
        throw new Error("Not a member of this team");
      }

      return {
        ...membership.team,
        role: membership.role,
      };
    }),

  invite: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        email: z.string().email(),
        role: z.enum(["coach", "player"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is a coach
      const membership = await db.query.teamMemberships.findFirst({
        where: (memberships, { and, eq }) =>
          and(
            eq(memberships.teamId, input.teamId),
            eq(memberships.userId, ctx.user.id),
          ),
      });

      if (!membership || membership.role !== "coach") {
        throw new Error("Only coaches can invite members");
      }

      // Find user by email
      const invitedUser = await db.query.users.findFirst({
        where: eq(users.email, input.email),
      });

      if (!invitedUser) {
        throw new Error("User not found");
      }

      // Check if already a member
      const existingMembership = await db.query.teamMemberships.findFirst({
        where: (memberships, { and, eq }) =>
          and(
            eq(memberships.teamId, input.teamId),
            eq(memberships.userId, invitedUser.id),
          ),
      });

      if (existingMembership) {
        throw new Error("User is already a member");
      }

      const [newMembership] = await db
        .insert(teamMemberships)
        .values({
          teamId: input.teamId,
          userId: invitedUser.id,
          role: input.role,
        })
        .returning();

      return newMembership;
    }),
});
