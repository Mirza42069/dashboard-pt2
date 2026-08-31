import { createPrismaClient } from "@DashboardPT2/db";
import { env } from "@DashboardPT2/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";

import {
  isValidAccountName,
  normalizeAccountName,
  normalizeUsername,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "./username";

type AuthDatabase = ReturnType<typeof createPrismaClient>;

type CreateAuthInstanceOptions = {
  database?: AuthDatabase;
  enableSignUp?: boolean;
};

export function createAuthInstance({
  database = createPrismaClient(),
  enableSignUp = false,
}: CreateAuthInstanceOptions = {}) {
  return betterAuth({
    appName: "Ledgerhouse",
    database: prismaAdapter(database, {
      provider: "postgresql",
    }),
    trustedOrigins: [env.BETTER_AUTH_URL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !enableSignUp,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
          input: false,
        },
        mustChangePassword: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        trialEndsAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },
    account: {
      accountLinking: {
        enabled: false,
        disableImplicitLinking: true,
        trustedProviders: [],
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
    },
    plugins: [
      username({
        minUsernameLength: USERNAME_MIN_LENGTH,
        maxUsernameLength: USERNAME_MAX_LENGTH,
        usernameValidator: isValidAccountName,
        displayUsernameValidator: isValidAccountName,
        usernameNormalization: normalizeUsername,
        displayUsernameNormalization: normalizeAccountName,
        immutableUsername: true,
      }),
    ],
  });
}
