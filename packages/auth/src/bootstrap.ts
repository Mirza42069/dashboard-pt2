import { createLocalAccountIssuer } from "better-auth";
import { hashPassword } from "better-auth/crypto";

import { createAuthInstance } from "./factory";

type SeedDatabase = NonNullable<Parameters<typeof createAuthInstance>[0]>["database"];

export function createSeedAuth(database: SeedDatabase) {
  return createAuthInstance({ database, enableSignUp: true });
}

export const credentialIssuer = createLocalAccountIssuer("credential");
export const hashSeedPassword: (password: string) => Promise<string> = hashPassword;
