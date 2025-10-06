import { auth, clerkClient } from "@clerk/nextjs/server";
import { db, users } from "@kolla/db";
import { initTRPC, TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { cache } from "react";
import "server-only";
import { s3Client } from "@/lib/s3";

export const createContext = cache(async () => {
  const { userId } = await auth();
  console.log("[tRPC Context] Clerk userId:", userId);

  let dbUser = null;
  if (userId) {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });

    if (existingUser) {
      dbUser = existingUser;
      console.log("[tRPC Context] DB user found:", { id: dbUser.id, email: dbUser.email });
    } else {
      console.warn("[tRPC Context] Clerk user authenticated but NO DB user found for userId:", userId);

      // Fallback: Auto-create user from Clerk data if webhook missed
      try {
        console.log("[tRPC Context] Attempting to fetch user from Clerk API and create DB record...");
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) {
          console.error("[tRPC Context] No email found for Clerk user:", userId);
        } else {
          const [newUser] = await db.insert(users).values({
            clerkUserId: userId,
            email,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          }).returning();

          dbUser = newUser;
          console.log("[tRPC Context] Successfully auto-created DB user:", { id: newUser.id, email: newUser.email });
        }
      } catch (error) {
        console.error("[tRPC Context] Failed to auto-create user:", error);
      }
    }
  } else {
    console.log("[tRPC Context] No Clerk userId (unauthenticated request)");
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
    console.error("[isAuthed Middleware] UNAUTHORIZED:", {
      hasClerkUserId: !!ctx.clerkUserId,
      hasDbUser: !!ctx.user,
      clerkUserId: ctx.clerkUserId || "none",
    });
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
      clerkUserId: ctx.clerkUserId,
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
      clerkUserId: ctx.clerkUserId,
      user: ctx.user,
      membership,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
export const teamProcedure = t.procedure.use(isAuthed).use(isTeamMember);
export const coachProcedure = t.procedure.use(isAuthed).use(isCoach);
