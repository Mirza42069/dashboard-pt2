import z from "zod";

import { financeDatabase, objectField, stringField } from "../lib/finance-database";
import { organizationProcedure } from "../index";

/**
 * Temporary response-shape adapter for the current construction dashboard.
 * It reads finance records only and can be removed when the frontend switches
 * to dashboard.summary and exceptions.list.
 */
export const projectRouter = {
  summary: organizationProcedure.handler(async ({ context }) => {
    const database = financeDatabase(context.database);
    const groups = await database.reconciliation.groupBy({
      by: ["status"],
      where: { organizationId: context.organization.id },
      _count: { _all: true },
    });
    const total = groups.reduce((sum, row) => {
      const count = objectField(row, "_count")?._all;
      return sum + (typeof count === "number" ? count : 0);
    }, 0);
    return {
      projects: {
        total,
        byStatus: { planning: total, active: 0, on_hold: 0, completed: 0, cancelled: 0 },
        baselined: total,
        measured: 0,
      },
      portfolioValue: 0,
      workCompletedValue: null,
      valueCompletionPercent: null,
      openTickets: 0,
    };
  }),

  exceptions: organizationProcedure
    .input(
      z
        .object({
          filter: z.enum(["all", "behind", "reporting", "review", "actions"]).default("all"),
          limit: z.number().int().min(1).max(100).default(25),
          offset: z.number().int().min(0).default(0),
        })
        .optional(),
    )
    .handler(async ({ context, input }) => {
      const database = financeDatabase(context.database);
      const limit = input?.limit ?? 25;
      const offset = input?.offset ?? 0;
      const where = { organizationId: context.organization.id, status: "OPEN" as const };
      const [rows, total, live, submitted] = await Promise.all([
        database.reconciliationException.findMany({
          where,
          include: { reconciliation: true },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: offset,
          take: limit,
        }),
        database.reconciliationException.count({ where }),
        database.reconciliation.count({ where: { organizationId: context.organization.id } }),
        database.reconciliation.count({
          where: { organizationId: context.organization.id, status: "SUBMITTED" },
        }),
      ]);
      const projects = rows.map((row) => {
        const reconciliation = objectField(row, "reconciliation") ?? {};
        const reconciliationId =
          stringField(row, "reconciliationId") ?? stringField(reconciliation, "id") ?? "";
        const status = stringField(reconciliation, "status");
        const periodEnd = reconciliation.periodEnd;
        return {
          projectId: reconciliationId,
          companyId: context.organization.id,
          code: stringField(reconciliation, "reference") ?? reconciliationId,
          name: stringField(reconciliation, "name") ?? "Reconciliation",
          status: "active" as const,
          hiddenModules: [],
          hasBaseline: true,
          progress: status === "APPROVED" ? 100 : status === "SUBMITTED" ? 75 : 25,
          planned: 100,
          contractValue: 0,
          deviation: null,
          previousDeviation: null,
          dataDate: periodEnd instanceof Date ? periodEnd.toISOString() : null,
          reportAgeDays: null,
          reportsDue: 0,
          reportsAwaitingReview: status === "SUBMITTED" ? 1 : 0,
          openTickets: 1,
          reasons: {
            behind: false,
            baselineMissing: false,
            unreported: false,
            stale: false,
            reportsDue: false,
            awaitingReview: status === "SUBMITTED",
            openActions: true,
          },
        };
      });
      return {
        counts: {
          live,
          behind: 0,
          stale: 0,
          unreported: 0,
          reporting: 0,
          reportsDue: 0,
          awaitingReview: submitted,
          openTickets: total,
        },
        total,
        projects,
        nextOffset: offset + projects.length < total ? offset + projects.length : null,
      };
    }),
};
