import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace-bootstrap";
import { escapeHtml, isBrevoConfigured, sendTransactionalEmail } from "@/lib/email/brevo";

const emailDeliveryEnabled = isBrevoConfigured();

export const auth = betterAuth({
  appName: "Elara",
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 5 },
    },
  },
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: emailDeliveryEnabled,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: emailDeliveryEnabled ? async ({ user, url }) => {
      const safeName = escapeHtml(user.name || "there");
      const safeUrl = escapeHtml(url);
      await sendTransactionalEmail({
        to: { email: user.email, name: user.name },
        subject: "Reset your Elara password",
        textContent: `Reset your Elara password: ${url}\n\nIf you did not request this, you can ignore this email.`,
        htmlContent: `<p>Hi ${safeName},</p><p><a href="${safeUrl}">Reset your Elara password</a></p><p>If you did not request this, you can ignore this email.</p>`,
        tag: "password-reset",
      });
    } : undefined,
  },
  emailVerification: emailDeliveryEnabled ? {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      const safeName = escapeHtml(user.name || "there");
      const safeUrl = escapeHtml(url);
      await sendTransactionalEmail({
        to: { email: user.email, name: user.name },
        subject: "Verify your Elara email",
        textContent: `Verify your Elara email address: ${url}`,
        htmlContent: `<p>Hi ${safeName},</p><p><a href="${safeUrl}">Verify your Elara email address</a></p><p>This link expires in one hour.</p>`,
        tag: "email-verification",
      });
    },
    afterEmailVerification: async (user) => {
      await ensureWorkspaceForUser(user.id, user.name);
    },
  } : undefined,
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          if (!emailDeliveryEnabled) await ensureWorkspaceForUser(user.id, user.name);
        },
      },
    },
  },
  plugins: [nextCookies()],
});
