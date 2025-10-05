import { currentUser } from "@clerk/nextjs/server";
import { db, users } from "db";
import { eq } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const authRouter = router({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user;
  }),

  // Sync Clerk user to database
  syncUser: publicProcedure.mutation(async () => {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return null;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUser.id),
    });

    if (existingUser) {
      return existingUser;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        clerkUserId: clerkUser.id,
        email,
      })
      .returning();

    return newUser;
  }),
});
