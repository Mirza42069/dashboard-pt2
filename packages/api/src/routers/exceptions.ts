import { ORPCError } from "@orpc/server";
import z from "zod";

import { appendReconciliationAudit } from "../lib/finance-audit";
import { financeDatabase, stringField } from "../lib/finance-database";
import { requireFinancePermission } from "../lib/finance-permissions";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

const id = z.string().trim().min(1).max(191);

export const exceptionsRouter = {
  list: organizationProcedure
    .input(
      z
        .object({
          cursor: id.optional(),
          limit: z.number().int().min(1).max(100).default(25),
          reconciliationId: id.optional(),
          status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "IGNORED"]).optional(),
        })
        .optional(),
    )
    .handler(async ({ context, input }) => {
      const database = financeDatabase(context.database);
      const limit = input?.limit ?? 25;
      if (input?.cursor) {
        const cursor = await database.reconciliationException.findFirst({
          where: { id: input.cursor, organizationId: context.organization.id },
          select: { id: true },
        });
        if (!cursor) throw new ORPCError("NOT_FOUND", { message: "Cursor not found." });
      }
      if (input?.reconciliationId) {
        const reconciliation = await database.reconciliation.findFirst({
          where: { id: input.reconciliationId, organizationId: context.organization.id },
          select: { id: true },
        });
        if (!reconciliation) {
          throw new ORPCError("NOT_FOUND", { message: "Reconciliation not found." });
        }
      }

      const rows = await database.reconciliationException.findMany({
        where: {
          organizationId: context.organization.id,
          ...(input?.reconciliationId ? { reconciliationId: input.reconciliationId } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        include: { reconciliation: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      return serializeFinanceValue({
        items,
        nextCursor: hasMore ? stringField(items.at(-1)!, "id") : null,
      });
    }),

  resolve: organizationProcedure
    .input(
      z.object({
        id,
        resolutionNote: z.string().trim().min(1).max(2_000),
      }),
    )
    .handler(async ({ context, input }) => {
      requireFinancePermission(context.organization.role, "exception:resolve");
      const database = financeDatabase(context.database);
      const organizationId = context.organization.id;

      const resolved = await database.$transaction(async (transaction) => {
        const exception = await transaction.reconciliationException.findFirst({
          where: { id: input.id, organizationId },
          select: { id: true, reconciliationId: true, status: true },
        });
        if (!exception) {
          throw new ORPCError("NOT_FOUND", { message: "Exception not found." });
        }
        if (stringField(exception, "status") === "RESOLVED") {
          throw new ORPCError("CONFLICT", { message: "Exception is already resolved." });
        }
        const reconciliationId = stringField(exception, "reconciliationId");
        if (!reconciliationId) throw new Error("Exception has no reconciliation id.");

        const update = await transaction.reconciliationException.updateMany({
          where: { id: input.id, organizationId, status: { not: "RESOLVED" } },
          data: {
            status: "RESOLVED",
            resolution: input.resolutionNote,
            resolvedAt: new Date(),
            resolvedById: context.session.user.id,
          },
        });
        if (update.count !== 1) {
          throw new ORPCError("CONFLICT", { message: "Exception was updated by another request." });
        }
        await appendReconciliationAudit(transaction, {
          organizationId,
          reconciliationId,
          actorId: context.session.user.id,
          eventType: "EXCEPTION_RESOLVED",
          metadata: { exceptionId: input.id },
        });
        return transaction.reconciliationException.findFirst({
          where: { id: input.id, organizationId },
        });
      });

      return serializeFinanceValue(resolved);
    }),
};
