import { auth } from "@/lib/auth";
import { db } from "@kolla/db";
import { initTRPC, TRPCError } from "@trpc/server";
import { headers } from "next/headers";
import { cache } from "react";
import "server-only";
import { s3Client } from "@/lib/s3";

export const createContext = cache(async () => {
  // Get session from Better Auth
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  console.log(
    "[tRPC Context] Session:",
    session ? { userId: session.user.id, email: session.user.email } : null
  );

  return {
    session,
    user: session?.user ?? null,
    s3: s3Client,
  };
});

const t = initTRPC.context<typeof createContext>().create();

export const createCallerFactory = t.createCallerFactory;
export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware to ensure user is authenticated
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    console.error("[isAuthed Middleware] UNAUTHORIZED:", {
      hasSession: !!ctx.session,
      hasUser: !!ctx.user,
    });
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.user,
    },
  });
});

// Middleware to check team membership and role
const isTeamMember = t.middleware(async ({ ctx, getRawInput, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const rawInput = await getRawInput();
  const teamId = (rawInput as { teamId?: number }).teamId;
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
      session: ctx.session,
      user: ctx.user,
      membership,
    },
  });
});

// Middleware to ensure user is a coach
const isCoach = t.middleware(async ({ ctx, getRawInput, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const rawInput = await getRawInput();
  const teamId = (rawInput as { teamId?: number }).teamId;
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
      session: ctx.session,
      user: ctx.user,
      membership,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const teamProcedure = t.procedure.use(isAuthed).use(isTeamMember);
export const coachProcedure = t.procedure.use(isAuthed).use(isCoach);
