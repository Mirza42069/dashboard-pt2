import { ORPCError } from "@orpc/server";
import z from "zod";

import { appendReconciliationAudit } from "../lib/finance-audit";
import { financeDatabase, stringField } from "../lib/finance-database";
import { resolveReconciliationTarget } from "../lib/finance-defaults";
import { requireFinancePermission } from "../lib/finance-permissions";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

const id = z.string().trim().min(1).max(191);
const reconciliationStatus = z.enum([
  "DRAFT",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "SUBMITTED",
  "APPROVED",
  "COMPLETED",
  "REOPENED",
]);

const pagination = z.object({
  cursor: id.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  /**
   * One status, or several.
   *
   * The array form exists for the archive, which is "approved or completed" —
   * a single filter over one paginated list rather than two lists a caller has
   * to merge and re-sort, which is where the cursor would have stopped meaning
   * anything. A bare string still works exactly as before.
   */
  status: z.union([reconciliationStatus, z.array(reconciliationStatus).min(1).max(7)]).optional(),
});

/**
 * What opening a period actually requires.
 *
 * The legal entity and ledger account used to be picked here and are now
 * derived from the name — see resolveReconciliationTarget. They are still
 * columns on the row, and still required by the schema; the caller just no
 * longer has to know they exist.
 */
const createReconciliation = z
  .object({
    name: z.string().trim().min(1).max(200),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  })
  .refine((input) => input.periodEnd >= input.periodStart, {
    message: "Period end must not be before period start.",
    path: ["periodEnd"],
  });

export const reconciliationRouter = {
  options: organizationProcedure.handler(async ({ context }) => {
    const database = financeDatabase(context.database);
    const organizationId = context.organization.id;
    const [legalEntities, ledgerAccounts] = await Promise.all([
      database.legalEntity.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, name: true, code: true, baseCurrency: true },
        orderBy: { name: "asc" },
      }),
      database.ledgerAccount.findMany({
        where: { organizationId, isActive: true },
        select: { id: true, legalEntityId: true, name: true, code: true, currency: true },
        orderBy: [{ code: "asc" }, { name: "asc" }],
      }),
    ]);
    return { legalEntities, ledgerAccounts };
  }),

  list: organizationProcedure
    .input(pagination.optional())
    .handler(async ({ context, input }) => {
      const database = financeDatabase(context.database);
      const limit = input?.limit ?? 25;
      if (input?.cursor) {
        const cursor = await database.reconciliation.findFirst({
          where: { id: input.cursor, organizationId: context.organization.id },
          select: { id: true },
        });
        if (!cursor) throw new ORPCError("NOT_FOUND", { message: "Cursor not found." });
      }
      const rows = await database.reconciliation.findMany({
        where: {
          organizationId: context.organization.id,
          ...(input?.status
            ? { status: Array.isArray(input.status) ? { in: input.status } : input.status }
            : {}),
        },
        include: {
          legalEntity: true,
          ledgerAccount: true,
          _count: { select: { importBatches: true, exceptions: true } },
        },
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

  get: organizationProcedure.input(z.object({ id })).handler(async ({ context, input }) => {
    const row = await financeDatabase(context.database).reconciliation.findFirst({
      where: { id: input.id, organizationId: context.organization.id },
      include: {
        legalEntity: true,
        ledgerAccount: true,
        importBatches: { orderBy: { createdAt: "desc" }, take: 20 },
        exceptions: { orderBy: { createdAt: "desc" }, take: 100 },
        events: { orderBy: { occurredAt: "desc" }, take: 100 },
        _count: { select: { transactions: true, matchGroups: true } },
      },
    });
    if (!row) throw new ORPCError("NOT_FOUND", { message: "Reconciliation not found." });
    return serializeFinanceValue(row);
  }),

  create: organizationProcedure
    .input(createReconciliation)
    .handler(async ({ context, input }) => {
      requireFinancePermission(context.organization.role, "reconciliation:create");
      const database = financeDatabase(context.database);
      const organizationId = context.organization.id;

      const row = await database.$transaction(async (transaction) => {
        // Inside the transaction because it may create the entity and the
        // account: if the reconciliation insert then fails — a duplicate period,
        // most likely — an account nobody asked for must not survive it.
        const target = await resolveReconciliationTarget(transaction, {
          organizationId,
          organizationName: context.organization.name,
          name: input.name,
          currency: input.currency,
        });

        const reconciliation = await transaction.reconciliation.create({
          data: {
            organizationId,
            legalEntityId: target.legalEntityId,
            ledgerAccountId: target.ledgerAccountId,
            name: input.name,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            currency: input.currency,
            status: "DRAFT",
            createdById: context.session.user.id,
          },
        });
        const reconciliationId = stringField(reconciliation, "id");
        if (!reconciliationId) throw new Error("Created reconciliation has no id.");
        await appendReconciliationAudit(transaction, {
          organizationId,
          reconciliationId,
          actorId: context.session.user.id,
          eventType: "CREATED",
          toStatus: "DRAFT",
        });
        return reconciliation;
      });

      return serializeFinanceValue(row);
    }),
};
