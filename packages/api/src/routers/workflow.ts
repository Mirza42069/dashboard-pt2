import { ORPCError } from "@orpc/server";
import z from "zod";

import {
  appendReconciliationAudit,
  type ReconciliationWorkflowStatus,
} from "../lib/finance-audit";
import { financeDatabase, stringField, type FinanceDatabase } from "../lib/finance-database";
import {
  requireFinancePermission,
  type FinancePermission,
} from "../lib/finance-permissions";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

const inputSchema = z.object({
  reconciliationId: z.string().trim().min(1).max(191),
  note: z.string().trim().max(2_000).optional(),
});

type Transition = {
  permission: FinancePermission;
  eventType: "SUBMITTED" | "APPROVED" | "REOPENED";
  fromStatuses: ReconciliationWorkflowStatus[];
  toStatus: ReconciliationWorkflowStatus;
};

async function transitionReconciliation(
  context: {
    database: unknown;
    organization: { id: string; role: string };
    session: { user: { id: string } };
  },
  input: z.infer<typeof inputSchema>,
  transition: Transition,
) {
  requireFinancePermission(context.organization.role, transition.permission);
  const database = financeDatabase(context.database);
  const organizationId = context.organization.id;

  const result = await database.$transaction(async (transaction) => {
    const reconciliation = await transaction.reconciliation.findFirst({
      where: { id: input.reconciliationId, organizationId },
      select: { id: true, status: true },
    });
    if (!reconciliation) {
      throw new ORPCError("NOT_FOUND", { message: "Reconciliation not found." });
    }
    const fromStatus = reconciliation.status;
    if (!transition.fromStatuses.includes(fromStatus)) {
      throw new ORPCError("CONFLICT", {
        message: `Reconciliation cannot be ${transition.eventType.toLowerCase()} from ${fromStatus}.`,
      });
    }

    if (transition.eventType === "APPROVED") {
      await enforceSeparationOfDuties(
        transaction,
        organizationId,
        input.reconciliationId,
        context.session.user.id,
      );
    }

    const update = await transaction.reconciliation.updateMany({
      where: {
        id: input.reconciliationId,
        organizationId,
        status: { in: transition.fromStatuses },
      },
      data: { status: transition.toStatus },
    });
    if (update.count !== 1) {
      throw new ORPCError("CONFLICT", {
        message: "Reconciliation was changed by another request.",
      });
    }

    await appendReconciliationAudit(transaction, {
      organizationId,
      reconciliationId: input.reconciliationId,
      actorId: context.session.user.id,
      eventType: transition.eventType,
      fromStatus,
      toStatus: transition.toStatus,
      metadata: input.note ? { note: input.note } : {},
    });
    return transaction.reconciliation.findFirst({
      where: { id: input.reconciliationId, organizationId },
    });
  });

  return serializeFinanceValue(result);
}

async function enforceSeparationOfDuties(
  database: FinanceDatabase,
  organizationId: string,
  reconciliationId: string,
  actorId: string,
) {
  const submission = await database.reconciliationEvent.findFirst({
    where: { organizationId, reconciliationId, type: "SUBMITTED" },
    orderBy: { occurredAt: "desc" },
    select: { actorId: true },
  });
  if (!submission) {
    throw new ORPCError("CONFLICT", { message: "No submission event exists to approve." });
  }
  if (stringField(submission, "actorId") === actorId) {
    throw new ORPCError("FORBIDDEN", {
      message: "The submitter cannot approve the same reconciliation.",
    });
  }
}

export const workflowRouter = {
  submit: organizationProcedure.input(inputSchema).handler(({ context, input }) =>
    transitionReconciliation(context, input, {
      permission: "workflow:submit",
      eventType: "SUBMITTED",
      fromStatuses: ["DRAFT", "REOPENED"],
      toStatus: "SUBMITTED",
    }),
  ),
  approve: organizationProcedure.input(inputSchema).handler(({ context, input }) =>
    transitionReconciliation(context, input, {
      permission: "workflow:approve",
      eventType: "APPROVED",
      fromStatuses: ["SUBMITTED"],
      toStatus: "APPROVED",
    }),
  ),
  reopen: organizationProcedure.input(inputSchema).handler(({ context, input }) =>
    transitionReconciliation(context, input, {
      permission: "workflow:reopen",
      eventType: "REOPENED",
      fromStatuses: ["APPROVED"],
      toStatus: "REOPENED",
    }),
  ),
};
