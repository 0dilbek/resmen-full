import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { db } from "@/infrastructure/db";
import * as schema from "./schema";
import { env } from "@/infrastructure/env";
import { systemSettings } from "@/modules/platform-admin/settings";
import { sendAuthMail } from "./mail";

let instance: ReturnType<typeof buildAuth> | undefined;
function buildAuth() {
  const config = env();
  return betterAuth({
    appName: "Ravoq",
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    trustedOrigins: [config.APP_URL],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) =>
        sendAuthMail(user.email, "Ravoq · Reset password", url),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) =>
        sendAuthMail(user.email, "Ravoq · Verify your email", url),
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => (await systemSettings()).registrationEnabled,
        },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, freshAge: 60 * 15 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 60 },
    plugins: [twoFactor({ issuer: "Ravoq" }), nextCookies()],
  });
}
export function auth() {
  return (instance ??= buildAuth());
}
export async function getSession() {
  const requestHeaders = await headers();
  return auth().api.getSession({ headers: requestHeaders });
}
