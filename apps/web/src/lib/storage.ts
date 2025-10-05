import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3_BUCKET, S3_PUBLIC_URL, s3Client } from "./s3";

export interface UploadOptions {
  key: string;
  body: Buffer | Uint8Array | Blob | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  key: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
}

/**
 * Upload a file to R2
 */
export async function uploadFile({
  key,
  body,
  contentType,
  metadata,
}: UploadOptions) {
  const params: PutObjectCommandInput = {
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return {
    key,
    url: getPublicUrl(key),
  };
}

/**
 * Get a presigned URL for uploading directly from the client
 */
export async function getPresignedUploadUrl({
  key,
  expiresIn = 3600,
}: PresignedUrlOptions) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Get a presigned URL for downloading a private file
 */
export async function getPresignedDownloadUrl({
  key,
  expiresIn = 3600,
}: PresignedUrlOptions) {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Check if a file exists in R2
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the public URL for a file (if bucket has public access configured)
 */
export function getPublicUrl(key: string): string {
  if (!S3_PUBLIC_URL) {
    throw new Error("S3_PUBLIC_URL not configured");
  }
  return `${S3_PUBLIC_URL}/${key}`;
}

/**
 * Generate a unique storage key for a video file
 */
export function generateVideoKey(
  teamId: string,
  eventId: string,
  clipId: string,
  filename: string,
): string {
  const ext = filename.split(".").pop();
  return `teams/${teamId}/events/${eventId}/clips/${clipId}/original.${ext}`;
}

/**
 * Generate a storage key for a transcoded video segment
 */
export function generateTranscodedKey(
  teamId: string,
  eventId: string,
  clipId: string,
  variant: string, // e.g., "720p", "1080p"
  segmentNumber?: number,
): string {
  if (segmentNumber !== undefined) {
    return `teams/${teamId}/events/${eventId}/clips/${clipId}/transcoded/${variant}/segment-${segmentNumber}.ts`;
  }
  return `teams/${teamId}/events/${eventId}/clips/${clipId}/transcoded/${variant}/playlist.m3u8`;
}
