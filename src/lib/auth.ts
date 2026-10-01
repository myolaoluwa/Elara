import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { ensureWorkspaceForUser } from "@/lib/workspace-bootstrap";
import { isBrevoConfigured, sendTransactionalEmail } from "@/lib/email/brevo";
import { authOTPEmail, passwordResetEmail } from "@/lib/email/templates";

const emailDeliveryEnabled = isBrevoConfigured();
const thirtyDays = 60 * 60 * 24 * 30;

async function sendAuthOTP(email: string, otp: string, type: "sign-in" | "email-verification" | "forget-password" | "change-email") {
  const messageId = await sendTransactionalEmail({ to: { email }, ...authOTPEmail(otp, type) });
  if (messageId) console.info("Brevo accepted an authentication email", { type, messageId });
}

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
      "/email-otp/send-verification-otp": { window: 300, max: 5 },
      "/email-otp/verify-email": { window: 300, max: 8 },
      "/two-factor/send-otp": { window: 300, max: 5 },
      "/two-factor/verify-otp": { window: 300, max: 8 },
    },
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  session: {
    expiresIn: thirtyDays,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 60,
    cookieCache: { enabled: true, maxAge: 5 * 60, strategy: "jwe" },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    requireEmailVerification: emailDeliveryEnabled,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: emailDeliveryEnabled ? async ({ user, url }) => {
      await sendTransactionalEmail({ to: { email: user.email, name: user.name }, ...passwordResetEmail(user.name, url) });
    } : undefined,
  },
  emailVerification: emailDeliveryEnabled ? {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    afterEmailVerification: async (user) => {
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
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
  hooks: emailDeliveryEnabled ? {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-in/email") return;
      const email = typeof context.body?.email === "string" ? context.body.email.trim().toLowerCase() : null;
      if (!email) return;
      await prisma.user.updateMany({
        where: { email, emailVerified: true, twoFactorEnabled: false },
        data: { twoFactorEnabled: true },
      });
    }),
  } : undefined,
  plugins: [
    ...(emailDeliveryEnabled ? [emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => sendAuthOTP(email, otp, type),
      otpLength: 6,
      expiresIn: 5 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      resendStrategy: "rotate",
      disableSignUp: true,
      overrideDefaultEmailVerification: true,
      rateLimit: { window: 5 * 60, max: 5 },
    }),
    twoFactor({
      issuer: "Elara",
      trustDeviceMaxAge: thirtyDays,
      twoFactorCookieMaxAge: 10 * 60,
      totpOptions: { disable: true },
      otpOptions: {
        digits: 6,
        period: 5,
        allowedAttempts: 5,
        storeOTP: "hashed",
        sendOTP: async ({ user, otp }) => sendAuthOTP(user.email, otp, "sign-in"),
      },
      accountLockout: { enabled: true, maxFailedAttempts: 10, durationSeconds: 15 * 60 },
    })] : []),
    nextCookies(),
  ],
});
