import { clips, db } from "@kolla/db";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-job-secret");
    if (signature !== process.env.JOB_SHARED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clipId, durationS, width, height, hlsPrefix, failed, reason } =
      body;

    if (failed) {
      await db
        .update(clips)
        .set({
          status: "failed",
          failReason: reason,
        })
        .where(eq(clips.id, clipId));
    } else {
      await db
        .update(clips)
        .set({
          status: "ready",
          durationS,
          width,
          height,
          hlsPrefix,
        })
        .where(eq(clips.id, clipId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
