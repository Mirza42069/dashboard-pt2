import z from "zod";

import { financeDatabase, objectField, stringField } from "../lib/finance-database";
import { organizationProcedure } from "../index";

export const activityRouter = {
  /**
   * The organization's audit trail, newest first.
   *
   * ActivityLog stores `resourceId`, not a name, because a name can change and
   * an audit row must not. That is right for the record and wrong for the
   * reader, so the reconciliations referenced by this page of rows are resolved
   * in one follow-up query and their current names substituted. A row whose
   * subject has since been deleted keeps its id, which is still the truth.
   *
   * Both `entityType` and `action` are lowercased on the way out: they are used
   * to build a dictionary key (`reconciliation_approved`), and the wire format
   * is UPPER_SNAKE while every dictionary in this app is lowercase.
   */
  list: organizationProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .handler(async ({ context, input }) => {
      const database = financeDatabase(context.database);
      const where = { organizationId: context.organization.id };
      const [rows, total] = await Promise.all([
        database.activityLog.findMany({
          where,
          include: { actor: true },
          orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
          skip: input.offset,
          take: input.limit,
        }),
        database.activityLog.count({ where }),
      ]);

      const reconciliationIds = [
        ...new Set(
          rows
            .filter((row) => stringField(row, "resourceType") === "Reconciliation")
            .map((row) => stringField(row, "resourceId"))
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      const named = reconciliationIds.length
        ? await database.reconciliation.findMany({
            where: { organizationId: context.organization.id, id: { in: reconciliationIds } },
            select: { id: true, name: true },
          })
        : [];
      const namesById = new Map(named.map((row) => [row.id, row.name]));

      return {
        entries: rows.map((row) => {
          const actor = objectField(row, "actor");
          const resourceId = stringField(row, "resourceId");
          return {
            id: stringField(row, "id") ?? "",
            entityType: (stringField(row, "resourceType") ?? "reconciliation").toLowerCase(),
            action: (stringField(row, "action") ?? "updated").toLowerCase(),
            // Null rather than a translated placeholder: the actor is set null
            // when an account is deleted, and only the client knows the reader's
            // language. See activity-popover.svelte.
            actorName: actor ? stringField(actor, "name") : null,
            entityLabel: (resourceId ? namesById.get(resourceId) : null) ?? resourceId ?? "",
            createdAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(0),
          };
        }),
        total,
      };
    }),
};
