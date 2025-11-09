/**
 * Provider-agnostic transcoding service interface
 */

export interface TranscodingJob {
  /** Unique job ID from the transcoding provider */
  jobId: string;
  /** Internal clip ID */
  clipId: number;
  /** Current status of the transcoding job */
  status: TranscodingStatus;
  /** Source video URL or storage key */
  sourceUrl: string;
  /** Output HLS prefix/URL when ready */
  hlsUrl?: string;
  /** Error message if failed */
  error?: string;
  /** Additional metadata from provider */
  metadata?: Record<string, unknown>;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

export type TranscodingStatus =
  | "queued" // Job submitted to provider
  | "processing" // Currently transcoding
  | "completed" // Successfully transcoded
  | "failed"; // Failed with error

export interface TranscodingProvider {
  readonly name: string;

  /**
   * Submit a video for transcoding
   * @param options Job submission options
   * @returns Job ID from the provider
   */
  submitJob(options: SubmitJobOptions): Promise<string>;

  /**
   * Get current status of a transcoding job
   * @param jobId Provider's job ID
   * @returns Current job status and metadata
   */
  getJobStatus(jobId: string): Promise<JobStatusResponse>;

  /**
   * Cancel a transcoding job (if supported)
   * @param jobId Provider's job ID
   */
  cancelJob?(jobId: string): Promise<void>;

  /**
   * Parse webhook payload from this provider
   * @param payload Raw webhook body
   * @param headers Request headers
   * @returns Parsed webhook data or null if invalid
   */
  parseWebhook?(
    payload: unknown,
    headers: Record<string, string>,
  ): WebhookPayload | null;
}

export interface SubmitJobOptions {
  /** Internal clip ID */
  clipId: number;
  /** Source video URL (presigned URL or public URL) */
  sourceUrl: string;
  /** Output configuration */
  output: {
    /** S3/R2 bucket for HLS output */
    bucket: string;
    /** Prefix for HLS files (e.g., "hls/123/456/") */
    prefix: string;
    /** Access credentials for output storage */
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
    };
  };
  /** Webhook URL for completion notification */
  webhookUrl: string;
  /** Additional provider-specific options */
  options?: Record<string, unknown>;
}

export interface JobStatusResponse {
  jobId: string;
  status: TranscodingStatus;
  /** Progress percentage (0-100) if available */
  progress?: number;
  /** HLS output URL when ready */
  hlsUrl?: string;
  /** Error details if failed */
  error?: string;
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface WebhookPayload {
  /** Provider's job ID */
  jobId: string;
  /** Updated status */
  status: TranscodingStatus;
  /** HLS output URL when completed */
  hlsUrl?: string;
  /** Error message if failed */
  error?: string;
  /** Progress percentage if available */
  progress?: number;
  /** Additional provider metadata */
  metadata?: Record<string, unknown>;
}

export interface TranscodingConfig {
  /** Which provider to use */
  provider: string;
  /** Base webhook URL for completion notifications */
  webhookBaseUrl: string;
  /** Provider-specific configuration */
  providers: {
    [key: string]: Record<string, unknown>;
  };
}
