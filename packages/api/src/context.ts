import { auth } from "@DashboardPT2/auth";
import database from "@DashboardPT2/db";

export type CreateContextOptions = {
  headers: Headers;
};

export async function createContext({ headers }: CreateContextOptions) {
  const session = (await auth.api.getSession({ headers })) ?? null;
  return {
    auth: null,
    database,
    headers,
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
