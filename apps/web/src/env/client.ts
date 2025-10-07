import { z } from "zod";

const clientEnvSchema = z.object({
  // Application URL
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),

  // Assets/CDN Base URL
  NEXT_PUBLIC_ASSETS_BASE: z
    .string()
    .url("NEXT_PUBLIC_ASSETS_BASE must be a valid URL"),
});

const parseClientEnv = () => {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ASSETS_BASE: process.env.NEXT_PUBLIC_ASSETS_BASE,
  });

  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error("Invalid client environment variables");
  }

  return parsed.data;
};

const env = parseClientEnv();

export default env;
