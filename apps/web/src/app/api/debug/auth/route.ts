import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const debugInfo = {
      session: {
        authenticated: !!session,
        userId: session?.user.id || null,
        email: session?.user.email || null,
      },
      user: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            emailVerified: session.user.emailVerified,
          }
        : null,
      timestamp: new Date().toISOString(),
    };

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
