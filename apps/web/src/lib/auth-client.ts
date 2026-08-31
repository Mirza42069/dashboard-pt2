import { createAuthClient } from "better-auth/svelte";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({ plugins: [usernameClient()] });

export type SessionUser = typeof authClient.$Infer.Session.user;
export type Session = typeof authClient.$Infer.Session;
