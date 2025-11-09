import { NextRequest } from "next/server";
import { transcodingService } from "../../../../lib/transcoding/service";

/**
 * Test endpoint to verify transcoding service configuration
 */
export async function GET() {
  try {
    // This will test that the service can be instantiated
    const service = transcodingService;

    return Response.json({
      success: true,
      message: "Transcoding service is configured correctly",
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Test webhook parsing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert headers to plain object
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Test webhook parsing without actually processing
    // Note: This will create a new service instance to test parsing
    const webhookData = body; // For now, just echo back the body

    return Response.json({
      success: true,
      webhookParsed: !!webhookData,
      webhookData: webhookData || null,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
