import { NextRequest } from "next/server";
import { transcodingService } from "../../../../lib/transcoding/service";

export async function POST(request: NextRequest) {
  try {
    // Get raw body and headers
    const body = await request.text();
    let payload: unknown;

    try {
      payload = JSON.parse(body);
    } catch {
      // If not JSON, pass raw body
      payload = body;
    }

    // Convert headers to plain object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Handle webhook through transcoding service
    await transcodingService.handleWebhook(payload, headers);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Some providers send GET requests to verify webhook endpoints
export async function GET() {
  return new Response("Webhook endpoint ready", { status: 200 });
}
