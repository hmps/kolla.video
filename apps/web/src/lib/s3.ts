import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.S3_ENDPOINT) {
  throw new Error("S3_ENDPOINT environment variable is required");
}
if (!process.env.S3_BUCKET) {
  throw new Error("S3_BUCKET environment variable is required");
}
if (!process.env.S3_ACCESS_KEY_ID) {
  throw new Error("S3_ACCESS_KEY_ID environment variable is required");
}
if (!process.env.S3_SECRET_ACCESS_KEY) {
  throw new Error("S3_SECRET_ACCESS_KEY environment variable is required");
}

export const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET = process.env.S3_BUCKET;
export const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;
