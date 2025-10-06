import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db, users } from "db";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env");
  }

  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify webhook
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error: Verification failed", { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response("Error: No email found", { status: 400 });
    }

    await db.insert(users).values({
      clerkUserId: id,
      email,
      firstName: first_name,
      lastName: last_name,
    });

    console.log(`User ${email} synced to database`);
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0]?.email_address;

    if (!email) {
      return new Response("Error: No email found", { status: 400 });
    }

    await db
      .update(users)
      .set({
        email,
        firstName: first_name,
        lastName: last_name,
      })
      .where(eq(users.clerkUserId, id));

    console.log(`User ${email} updated in database`);
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (id) {
      await db.delete(users).where(eq(users.clerkUserId, id));
      console.log(`User ${id} deleted from database`);
    } else {
      console.log("Error: No user ID found");
      return new Response("", { status: 500 });
    }

  }

  return new Response("", { status: 200 });
}
