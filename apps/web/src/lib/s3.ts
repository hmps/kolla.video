import { S3Client } from "@aws-sdk/client-s3";
import env from "@/env/server";

export const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export const S3_BUCKET = env.S3_BUCKET;
export const S3_PUBLIC_URL = env.S3_PUBLIC_URL;
