import z from "zod";

import { financeDatabase, objectField, stringField } from "../lib/finance-database";
import { organizationProcedure } from "../index";

export const activityRouter = {
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

      return {
        entries: rows.map((row) => {
          const actor = objectField(row, "actor");
          return {
            id: stringField(row, "id") ?? "",
            entityType: stringField(row, "resourceType") ?? "reconciliation",
            action: stringField(row, "action") ?? "updated",
            actorName:
              stringField(row, "actorName") ??
              (actor ? stringField(actor, "name") : null) ??
              "Unknown user",
            entityLabel:
              stringField(row, "resourceId") ?? "Reconciliation",
            detail: stringField(row, "detail"),
            createdAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(0),
          };
        }),
        total,
      };
    }),
};
