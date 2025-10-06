import { auth } from "@clerk/nextjs/server";
import { db, users } from "@kolla/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();

    const debugInfo = {
      clerk: {
        authenticated: !!userId,
        userId: userId || null,
      },
      database: {
        user: null as any,
      },
      timestamp: new Date().toISOString(),
    };

    if (userId) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkUserId, userId),
      });

      debugInfo.database.user = dbUser
        ? {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            createdAt: dbUser.createdAt,
          }
        : null;
    }

    return NextResponse.json(debugInfo);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get auth debug info",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
