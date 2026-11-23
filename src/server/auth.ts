import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/env";
import { db } from "./db";
import { email, linkEmail } from "./email";

function build() {
  const e = env();
  const google = e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET ? { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET } : undefined;

  return betterAuth({
    appName: "ShitShpejt",
    baseURL: e.BETTER_AUTH_URL,
    secret: e.BETTER_AUTH_SECRET,
    trustedOrigins: [e.SITE_URL],
    database: prismaAdapter(db, { provider: "postgresql" }),
    advanced: {
      useSecureCookies: e.APP_ENV === "production" || e.APP_ENV === "staging",
      database: { generateId: () => crypto.randomUUID() },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      // Required verification also enables Better Auth's sign-up enumeration protection.
      requireEmailVerification: e.REQUIRE_EMAIL_VERIFICATION,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await email().send(
          linkEmail({
            to: user.email,
            subject: "Rivendos fjalëkalimin — ShitShpejt",
            intro: "Dikush kërkoi rivendosjen e fjalëkalimit për llogarinë tënde. Nëse nuk ishe ti, injoroje këtë email.",
            cta: "Rivendos fjalëkalimin",
            url,
            outro: "Linku skadon pas 1 ore.",
          }),
        );
      },
    },
    emailVerification: {
      sendOnSignUp: e.REQUIRE_EMAIL_VERIFICATION,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await email().send(
          linkEmail({
            to: user.email,
            subject: "Konfirmo email-in — ShitShpejt",
            intro: `Mirë se erdhe, ${user.name}! Konfirmo adresën e email-it për të aktivizuar llogarinë.`,
            cta: "Konfirmo email-in",
            url,
          }),
        );
      },
    },
    socialProviders: google ? { google } : undefined,
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "USER" },
      },
      deleteUser: { enabled: false }, // handled by our own scrub flow (features/account)
    },
    rateLimit: {
      enabled: e.APP_ENV !== "test" && process.env.DISABLE_RATE_LIMIT !== "1",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 300, max: 3 },
        "/send-verification-email": { window: 300, max: 3 },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const u = await db.user.findUnique({ where: { id: session.userId }, select: { bannedAt: true, deletedAt: true } });
            if (u?.bannedAt || u?.deletedAt) return false;
            return { data: session };
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof build>;
const g = globalThis as unknown as { __auth?: Auth };
export function auth(): Auth {
  g.__auth ??= build();
  return g.__auth;
}

export const googleEnabled = () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET);
