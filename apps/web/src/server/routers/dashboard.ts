import { db, desc, eq, events, sql, teamMemberships } from "@kolla/db";
import { protectedProcedure, router } from "../trpc";

export const dashboardRouter = router({
  // Get user's teams with their role
  myTeams: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await db.query.teamMemberships.findMany({
      where: eq(teamMemberships.userId, ctx.user.id),
      with: {
        team: true,
      },
    });

    return memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: m.role,
    }));
  }),

  // Get 5 most recent events across all user's teams
  recentEvents: protectedProcedure.query(async ({ ctx }) => {
    // First get all team IDs user is a member of
    const memberships = await db.query.teamMemberships.findMany({
      where: eq(teamMemberships.userId, ctx.user.id),
    });

    const teamIds = memberships.map((m) => m.teamId);

    if (teamIds.length === 0) {
      return [];
    }

    // Get recent events from those teams with clip counts
    const recentEvents = await db
      .select({
        id: events.id,
        title: events.title,
        date: events.date,
        type: events.type,
        teamId: events.teamId,
        teamName: sql<string>`(SELECT name FROM teams WHERE id = ${events.teamId})`,
        clipCount: sql<number>`(SELECT COUNT(*) FROM clips WHERE event_id = ${events.id})`,
      })
      .from(events)
      .where(sql`${events.teamId} IN ${teamIds}`)
      .orderBy(desc(events.date))
      .limit(5);

    return recentEvents;
  }),
});
