import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { db, users } from "db";
import { eq } from "drizzle-orm";
import { cache } from "react";
import "server-only";
import { s3Client } from "@/lib/s3";

export const createContext = cache(async () => {
  const { userId } = await auth();

  let dbUser = null;
  if (userId) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });

    if (existingUser) {
      dbUser = existingUser;
    }
  }

  return {
    clerkUserId: userId,
    user: dbUser,
    s3: s3Client,
  };
});

const t = initTRPC.context<typeof createContext>().create();

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to ensure user is authenticated
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.clerkUserId || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      clerkUserId: ctx.clerkUserId,
      user: ctx.user,
    },
  });
});

// Middleware to check team membership and role
const isTeamMember = t.middleware(async ({ ctx, input, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const teamId = (input as { teamId?: number }).teamId;
  if (!teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "teamId is required",
    });
  }

  const userId = ctx.user.id;
  const membership = await db.query.teamMemberships.findFirst({
    where: (memberships, { and, eq }) =>
      and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)),
  });

  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this team",
    });
  }

  return next({
    ctx: {
      clerkUserId: ctx.clerkUserId,
      user: ctx.user,
      membership,
    },
  });
});

// Middleware to ensure user is a coach
const isCoach = t.middleware(async ({ ctx, input, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const teamId = (input as { teamId?: number }).teamId;
  if (!teamId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "teamId is required",
    });
  }

  const userId = ctx.user.id;
  const membership = await db.query.teamMemberships.findFirst({
    where: (memberships, { and, eq }) =>
      and(eq(memberships.teamId, teamId), eq(memberships.userId, userId)),
  });

  if (!membership || membership.role !== "coach") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Coach role required",
    });
  }

  return next({
    ctx: {
      clerkUserId: ctx.clerkUserId,
      user: ctx.user,
      membership,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const teamProcedure = t.procedure.use(isAuthed).use(isTeamMember);
export const coachProcedure = t.procedure.use(isAuthed).use(isCoach);
