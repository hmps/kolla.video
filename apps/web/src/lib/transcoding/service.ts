import { clips, db, eq } from "@kolla/db";
import type {
  TranscodingProvider,
  SubmitJobOptions,
  TranscodingConfig,
  WebhookPayload,
} from "./types";
import { getTranscodingConfig } from "./config";
import { createCustomProvider } from "./providers/custom";

/**
 * Main transcoding service - provider agnostic
 */
export class TranscodingService {
  private provider: TranscodingProvider;
  private config: TranscodingConfig;

  constructor() {
    this.config = getTranscodingConfig();
    this.provider = this.createProvider();
  }

  /**
   * Submit a clip for transcoding
   */
  async submitClip(clipId: number): Promise<void> {
    // Get clip details
    const clip = await db.query.clips.findFirst({
      where: eq(clips.id, clipId),
    });

    if (!clip) {
      throw new Error(`Clip ${clipId} not found`);
    }

    if (clip.status !== "uploaded") {
      throw new Error(`Clip ${clipId} is not in uploaded status`);
    }

    try {
      // Update status to processing
      await db
        .update(clips)
        .set({ status: "processing" })
        .where(eq(clips.id, clipId));

      // Build source URL (you may need to adjust this based on your storage setup)
      const sourceUrl = await this.buildSourceUrl(clip.storageKey);

      // Submit job to provider
      const jobId = await this.provider.submitJob({
        clipId,
        sourceUrl,
        output: {
          bucket: process.env.S3_BUCKET!,
          prefix: `hls/${clip.teamId}/${clip.eventId}/${clipId}/`,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            endpoint: process.env.S3_ENDPOINT,
          },
        },
        webhookUrl: `${this.config.webhookBaseUrl}/api/transcoding/webhook`,
        options: this.config.providers[this.config.provider] || {},
      });

      // Store job ID for tracking
      await db
        .update(clips)
        .set({ transcodingJobId: jobId })
        .where(eq(clips.id, clipId));

      console.log(`Submitted transcoding job ${jobId} for clip ${clipId}`);
    } catch (error) {
      // Update status to failed on error
      await db
        .update(clips)
        .set({
          status: "failed",
          failReason: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(clips.id, clipId));

      throw error;
    }
  }

  /**
   * Handle webhook notification from transcoding provider
   */
  async handleWebhook(
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<void> {
    const webhookData = this.provider.parseWebhook?.(payload, headers);

    if (!webhookData) {
      console.warn("Invalid webhook payload received");
      return;
    }

    await this.updateClipStatus(webhookData);
  }

  /**
   * Update clip status based on webhook data
   */
  private async updateClipStatus(webhook: WebhookPayload): Promise<void> {
    // Find clip by transcoding job ID
    const clip = await db.query.clips.findFirst({
      where: eq(clips.transcodingJobId, webhook.jobId),
    });

    if (!clip) {
      console.warn(`No clip found for transcoding job ID: ${webhook.jobId}`);
      return;
    }

    const updates: {
      status?: "ready" | "failed";
      hlsPrefix?: string;
      failReason?: string;
    } = {};

    switch (webhook.status) {
      case "completed":
        updates.status = "ready";
        if (webhook.hlsUrl) {
          // Store the HLS prefix/URL
          updates.hlsPrefix = webhook.hlsUrl;
        }
        break;

      case "failed":
        updates.status = "failed";
        updates.failReason = webhook.error || "Transcoding failed";
        break;

      case "processing":
      case "queued":
        // Keep status as "processing", no database update needed
        console.log(
          `Clip ${clip.id} transcoding in progress: ${webhook.jobId}`,
        );
        return;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(clips).set(updates).where(eq(clips.id, clip.id));

      console.log(`Updated clip ${clip.id} status from webhook:`, updates);
    }
  }

  /**
   * Build source URL for transcoding service
   */
  private async buildSourceUrl(storageKey: string): Promise<string> {
    // If using presigned URLs
    const { getPresignedDownloadUrl } = await import("../storage");
    return getPresignedDownloadUrl({ key: storageKey });

    // OR if using public URLs:
    // return `https://${process.env.S3_BUCKET}.${process.env.S3_ENDPOINT}/${storageKey}`;
  }

  /**
   * Create the appropriate provider instance
   */
  private createProvider(): TranscodingProvider {
    switch (this.config.provider) {
      case "custom":
        return createCustomProvider(this.config.providers.custom || {});

      // Add other providers as needed:
      // case "mux":
      //   return createMuxProvider(this.config.providers.mux || {});
      // case "cloudflare":
      //   return createCloudflareProvider(this.config.providers.cloudflare || {});

      default:
        throw new Error(
          `Unknown transcoding provider: ${this.config.provider}`,
        );
    }
  }
}

// Singleton instance
export const transcodingService = new TranscodingService();
