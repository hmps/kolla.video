import type { TranscodingConfig } from "./types";

/**
 * Get transcoding configuration from environment variables
 */
export function getTranscodingConfig(): TranscodingConfig {
  const provider = process.env.TRANSCODING_PROVIDER || "custom";
  const webhookBaseUrl =
    process.env.TRANSCODING_WEBHOOK_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return {
    provider,
    webhookBaseUrl,
    providers: {
      custom: {
        apiUrl: process.env.TRANSCODING_CUSTOM_API_URL,
        apiKey: process.env.TRANSCODING_CUSTOM_API_KEY,
        // Add any other custom provider options
      },
      mux: {
        accessToken: process.env.MUX_ACCESS_TOKEN,
        secretKey: process.env.MUX_SECRET_KEY,
      },
      cloudflare: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
      },
      // Add other providers as needed
    },
  };
}
