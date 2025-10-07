import { z } from "zod";

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Clerk Authentication
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required"),

  JOB_SHARED_SECRET: z.string().min(1, "JOB_SHARED_SECRET is required"),

  // S3/R2 Storage
  S3_ENDPOINT: z.string().url("S3_ENDPOINT must be a valid URL"),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required"),
  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),
  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),
  S3_REGION: z.string().default("auto"),
  S3_PUBLIC_URL: z.string().url().optional(),
});

const parseServerEnv = () => {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("Invalid server environment variables");
  }

  return parsed.data;
};

const env = parseServerEnv();

export default env;
