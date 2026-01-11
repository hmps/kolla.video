"use client";

import { createAuthClient } from "better-auth/react";
import { magicLinkClient, inferAdditionalFields } from "better-auth/client/plugins";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [magicLinkClient(), inferAdditionalFields<typeof auth>()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;

// Alias for backwards compatibility
export const forgetPassword = requestPasswordReset;
