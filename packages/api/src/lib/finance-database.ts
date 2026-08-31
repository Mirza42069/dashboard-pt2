import type { createPrismaClient } from "@DashboardPT2/db";

export type DatabaseRow = Record<string, unknown>;

type Database = ReturnType<typeof createPrismaClient>;

export type FinanceDatabase = Pick<
  Database,
  | "organizationMembership"
  | "legalEntity"
  | "ledgerAccount"
  | "reconciliation"
  | "importBatch"
  | "importArtifact"
  | "importRow"
  | "importCellEdit"
  | "importValidationRun"
  | "importValidationIssue"
  | "transaction"
  | "matchGroup"
  | "matchItem"
  | "reconciliationException"
  | "reconciliationEvent"
  | "activityLog"
  | "$transaction"
>;

export function financeDatabase(database: unknown): FinanceDatabase {
  return database as FinanceDatabase;
}

export function stringField(row: DatabaseRow, field: string) {
  const value = row[field];
  return typeof value === "string" ? value : null;
}

export function objectField(row: DatabaseRow, field: string) {
  const value = row[field];
  return value && typeof value === "object" ? (value as DatabaseRow) : null;
}
