import type {
  TranscodingProvider,
  SubmitJobOptions,
  JobStatusResponse,
  WebhookPayload,
  TranscodingStatus,
} from "../types";

interface CustomProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  [key: string]: unknown;
}

/**
 * Custom transcoding provider implementation
 * Adapt this to match your transcoding service's API
 */
export class CustomTranscodingProvider implements TranscodingProvider {
  readonly name = "custom";
  private config: CustomProviderConfig;

  constructor(config: CustomProviderConfig) {
    this.config = config;

    if (!config.apiUrl) {
      throw new Error(
        "TRANSCODING_CUSTOM_API_URL is required for custom provider",
      );
    }
  }

  async submitJob(options: SubmitJobOptions): Promise<string> {
    const response = await fetch(`${this.config.apiUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
      body: JSON.stringify({
        // Adapt this payload to match your service's expected format
        source: {
          url: options.sourceUrl,
        },
        output: {
          type: "hls",
          bucket: options.output.bucket,
          prefix: options.output.prefix,
          credentials: options.output.credentials,
        },
        webhook: {
          url: options.webhookUrl,
          events: ["job.completed", "job.failed"], // Adjust as needed
        },
        metadata: {
          clipId: options.clipId,
        },
        // Include any provider-specific options
        ...options.options,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to submit transcoding job: ${error}`);
    }

    const result = await response.json();
    return result.jobId; // Adjust based on your API response format
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${this.config.apiUrl}/jobs/${jobId}`, {
      headers: {
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    const job = await response.json();

    // Adapt this to match your service's response format
    return {
      jobId: job.id,
      status: this.mapStatus(job.status),
      progress: job.progress,
      hlsUrl: job.output?.hlsUrl,
      error: job.error,
      metadata: job.metadata,
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.config.apiUrl}/jobs/${jobId}/cancel`, {
      method: "POST",
      headers: {
        ...(this.config.apiKey && {
          Authorization: `Bearer ${this.config.apiKey}`,
        }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`);
    }
  }

  parseWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): WebhookPayload | null {
    try {
      // Add webhook signature verification if your service supports it
      if (this.config.apiKey) {
        const signature =
          headers["x-webhook-signature"] || headers["x-signature"];
        if (signature && !this.verifyWebhookSignature(payload, signature)) {
          console.warn("Invalid webhook signature");
          return null;
        }
      }

      const data = payload as any; // Adjust typing based on your webhook format

      return {
        jobId: data.jobId,
        status: this.mapStatus(data.status),
        progress: data.progress,
        hlsUrl: data.output?.hlsUrl,
        error: data.error,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error("Failed to parse webhook payload:", error);
      return null;
    }
  }

  /**
   * Map your service's status values to our standard enum
   */
  private mapStatus(providerStatus: string): TranscodingStatus {
    // Adapt these mappings to match your service's status values
    switch (providerStatus?.toLowerCase()) {
      case "pending":
      case "queued":
        return "queued";
      case "processing":
      case "transcoding":
      case "running":
        return "processing";
      case "completed":
      case "finished":
      case "success":
        return "completed";
      case "failed":
      case "error":
        return "failed";
      default:
        console.warn(`Unknown provider status: ${providerStatus}`);
        return "queued";
    }
  }

  /**
   * Verify webhook signature (implement based on your service's method)
   */
  private verifyWebhookSignature(payload: unknown, signature: string): boolean {
    // Implement signature verification based on your service's method
    // Example for HMAC-SHA256:
    // const crypto = require("crypto");
    // const expectedSignature = crypto
    //   .createHmac("sha256", this.config.webhookSecret)
    //   .update(JSON.stringify(payload))
    //   .digest("hex");
    // return signature === expectedSignature;

    // For now, return true (no verification)
    return true;
  }
}

/**
 * Factory function to create custom provider instance
 */
export function createCustomProvider(
  config: CustomProviderConfig,
): CustomTranscodingProvider {
  return new CustomTranscodingProvider(config);
}
