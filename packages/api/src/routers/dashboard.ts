import { financeDatabase, objectField } from "../lib/finance-database";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

export async function loadDashboardSummary(context: {
  database: unknown;
  organization: { id: string };
}) {
  const database = financeDatabase(context.database);
  const organizationId = context.organization.id;
  const [statusGroups, openExceptions, pendingImports, transactions, exceptionAmounts] =
    await Promise.all([
      database.reconciliation.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      database.reconciliationException.count({
        where: { organizationId, status: "OPEN" },
      }),
      database.importBatch.count({
        where: { organizationId, status: { in: ["PENDING", "PROCESSING"] } },
      }),
      database.transaction.count({ where: { organizationId } }),
      database.reconciliationException.aggregate({
        where: { organizationId, status: "OPEN" },
        _sum: { amount: true },
      }),
    ]);

  const reconciliationsByStatus = Object.fromEntries(
    statusGroups.map((row) => {
      const count = objectField(row, "_count")?._all;
      return [String(row.status), typeof count === "number" ? count : 0];
    }),
  );

  return serializeFinanceValue({
    reconciliations: {
      total: Object.values(reconciliationsByStatus).reduce((total, count) => total + count, 0),
      byStatus: reconciliationsByStatus,
    },
    exceptions: {
      open: openExceptions,
      openAmount: objectField(exceptionAmounts, "_sum")?.amount ?? null,
    },
    imports: { pending: pendingImports },
    transactions: { total: transactions },
  });
}

export const dashboardRouter = {
  summary: organizationProcedure.handler(({ context }) => loadDashboardSummary(context)),
};
