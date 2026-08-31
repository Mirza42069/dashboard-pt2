import { ORPCError } from "@orpc/server";
import z from "zod";

import { appendReconciliationAudit } from "../lib/finance-audit";
import { financeDatabase, stringField } from "../lib/finance-database";
import { requireFinancePermission } from "../lib/finance-permissions";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

const inputSchema = z.object({
  reconciliationId: z.string().trim().min(1).max(191),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(150),
  sizeBytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  source: z.enum(["BANK_STATEMENT", "ERP", "CSV", "API", "MANUAL"]),
});

export const importBatchRouter = {
  createMetadata: organizationProcedure.input(inputSchema).handler(async ({ context, input }) => {
    requireFinancePermission(context.organization.role, "import:create");
    const database = financeDatabase(context.database);
    const organizationId = context.organization.id;

    const batch = await database.$transaction(async (transaction) => {
      // The conditional write serializes this check with workflow status writes.
      const writable = await transaction.reconciliation.updateMany({
        where: {
          id: input.reconciliationId,
          organizationId,
          status: { not: "APPROVED" },
        },
        data: { updatedAt: new Date() },
      });
      if (writable.count !== 1) {
        const reconciliation = await transaction.reconciliation.findFirst({
          where: { id: input.reconciliationId, organizationId },
          select: { id: true, status: true },
        });
        if (!reconciliation) {
          throw new ORPCError("NOT_FOUND", { message: "Reconciliation not found." });
        }
        throw new ORPCError("CONFLICT", {
          message: "An approved reconciliation must be reopened before importing.",
        });
      }

      const reconciliation = await transaction.reconciliation.findFirstOrThrow({
        where: { id: input.reconciliationId, organizationId },
        select: { legalEntityId: true },
      });

      const created = await transaction.importBatch.create({
        data: {
          organizationId,
          reconciliationId: input.reconciliationId,
          legalEntityId: reconciliation.legalEntityId,
          originalFilename: input.fileName,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          source: input.source,
          status: "PENDING",
          createdById: context.session.user.id,
        },
      });
      await appendReconciliationAudit(transaction, {
        organizationId,
        reconciliationId: input.reconciliationId,
        actorId: context.session.user.id,
        eventType: "IMPORT_METADATA_CREATED",
        metadata: { importBatchId: stringField(created, "id") ?? "" },
      });
      return created;
    });

    return serializeFinanceValue(batch);
  }),
};
