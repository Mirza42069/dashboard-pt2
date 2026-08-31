import type { createPrismaClient } from "@DashboardPT2/db";

type Database = ReturnType<typeof createPrismaClient>;

/**
 * The chat half of the client, narrowed the same way FinanceDatabase narrows the
 * finance half.
 *
 * A separate type rather than two more keys on FinanceDatabase: a procedure that
 * reads reconciliations has no business writing conversations, and the narrowing
 * is what says so. `$transaction` appears in both because both need it.
 */
export type ChatDatabase = Pick<Database, "conversation" | "chatMessage" | "$transaction">;

export function chatDatabase(database: unknown): ChatDatabase {
  return database as ChatDatabase;
}
