import * as postmark from "postmark";
import env from "@/env/server";

const client = new postmark.ServerClient(env.POSTMARK_API_KEY);
const EMAIL_FROM = "noreply@kolla.video";

type EmailTemplate =
  | "email-verification"
  | "password-reset"
  | "magic-link";

interface SendEmailOptions {
  to: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, string>;
}

const templates: Record<EmailTemplate, (data: Record<string, string>) => { text: string; html: string }> = {
  "email-verification": (data) => ({
    text: `Hi ${data.name || "there"},\n\nPlease verify your email by clicking this link: ${data.url}\n\nThis link will expire in 24 hours.\n\nThanks,\nThe Kolla Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email</h2>
        <p>Hi ${data.name || "there"},</p>
        <p>Please verify your email by clicking the button below:</p>
        <p style="margin: 24px 0;">
          <a href="${data.url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">This link will expire in 24 hours.</p>
        <p>Thanks,<br>The Kolla Team</p>
      </div>
    `,
  }),
  "password-reset": (data) => ({
    text: `Hi ${data.name || "there"},\n\nReset your password by clicking this link: ${data.url}\n\nIf you didn't request this, please ignore this email.\n\nThis link will expire in 1 hour.\n\nThanks,\nThe Kolla Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Hi ${data.name || "there"},</p>
        <p>Click the button below to reset your password:</p>
        <p style="margin: 24px 0;">
          <a href="${data.url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">If you didn't request this, please ignore this email. This link will expire in 1 hour.</p>
        <p>Thanks,<br>The Kolla Team</p>
      </div>
    `,
  }),
  "magic-link": (data) => ({
    text: `Hi ${data.name || "there"},\n\nSign in to Kolla by clicking this link: ${data.url}\n\nThis link will expire in 10 minutes.\n\nThanks,\nThe Kolla Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sign in to Kolla</h2>
        <p>Hi ${data.name || "there"},</p>
        <p>Click the button below to sign in:</p>
        <p style="margin: 24px 0;">
          <a href="${data.url}" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Sign In
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">This link will expire in 10 minutes.</p>
        <p>Thanks,<br>The Kolla Team</p>
      </div>
    `,
  }),
};

export async function sendEmail({ to, subject, template, data }: SendEmailOptions) {
  const emailContent = templates[template](data);

  await client.sendEmail({
    From: EMAIL_FROM,
    To: to,
    Subject: subject,
    TextBody: emailContent.text,
    HtmlBody: emailContent.html,
    MessageStream: "outbound",
  });
}
