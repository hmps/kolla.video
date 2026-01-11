import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import {
  db,
  users,
  sessions,
  accounts,
  verifications,
} from "@kolla/db";
import { sendEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),

  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password - Kolla",
        template: "password-reset",
        data: { url, name: user.name || "" },
      });
    },
  },

  // Email verification
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email - Kolla",
        template: "email-verification",
        data: { url, name: user.name || "" },
      });
    },
  },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  // User additional fields
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
        input: true,
      },
      lastName: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },

  // Plugins (nextCookies must be last for proper cookie handling in server actions)
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Sign in to Kolla",
          template: "magic-link",
          data: { url, name: "" },
        });
      },
    }),
    nextCookies(),
  ],

  // Trusted origins for CSRF protection
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
