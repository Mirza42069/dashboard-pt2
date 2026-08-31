import type { FinanceDatabase } from "./finance-database";

type AuditInput = {
  organizationId: string;
  reconciliationId: string;
  actorId: string;
  eventType:
    | "CREATED"
    | "SUBMITTED"
    | "APPROVED"
    | "REOPENED"
    | "IMPORT_METADATA_CREATED"
    | "EXCEPTION_RESOLVED";
  fromStatus?: ReconciliationWorkflowStatus | null;
  toStatus?: ReconciliationWorkflowStatus | null;
  metadata?: Record<string, string>;
};

export type ReconciliationWorkflowStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "READY_FOR_REVIEW"
  | "SUBMITTED"
  | "APPROVED"
  | "COMPLETED"
  | "REOPENED";

/** Event and activity records must succeed or fail with their domain mutation. */
export async function appendReconciliationAudit(database: FinanceDatabase, input: AuditInput) {
  await database.reconciliationEvent.create({
    data: {
      organizationId: input.organizationId,
      reconciliationId: input.reconciliationId,
      actorId: input.actorId,
      type: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      payload: input.metadata ?? {},
    },
  });
  await database.activityLog.create({
    data: {
      organizationId: input.organizationId,
      actorId: input.actorId,
      action: input.eventType,
      resourceType: "Reconciliation",
      resourceId: input.reconciliationId,
      metadata: input.metadata ?? {},
    },
  });
}
