type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asNullableAmount(value: unknown): string | null {
  return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

export type DashboardSummary = {
  totalReconciliations: number;
  inProgress: number;
  awaitingApproval: number;
  openExceptions: number;
  openExceptionAmount: string | null;
  pendingImports: number;
  totalTransactions: number;
};

export type ReconciliationListItem = {
  id: string;
  name: string;
  legalEntityName: string;
  accountName: string;
  accountCode: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  exceptionCount: number;
  importCount: number;
  updatedAt: string;
};

export type ReconciliationList = {
  items: ReconciliationListItem[];
  nextCursor: string | null;
};

export type ReconciliationActivity = {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: string;
};

export type ReconciliationDetail = ReconciliationListItem & {
  openingBalance: string | null;
  closingBalance: string | null;
  statementBalance: string | null;
  reconciledBalance: string | null;
  transactionCount: number;
  matchGroupCount: number;
  activity: ReconciliationActivity[];
};

export type ReconciliationException = {
  id: string;
  type: string;
  title: string;
  detail: string | null;
  severity: string;
  status: string;
  assignedToId: string | null;
  createdAt: string;
};

export type ExceptionList = {
  items: ReconciliationException[];
  nextCursor: string | null;
};

export type CreateReconciliationInput = {
  name: string;
  legalEntityId: string;
  ledgerAccountId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
};

export const financeKeys = {
  summary: ["finance", "dashboard", "summary"] as const,
  options: ["finance", "reconciliation", "options"] as const,
  reconciliations: ["finance", "reconciliation", "list"] as const,
  reconciliation: (id: string) => ["finance", "reconciliation", id] as const,
  exceptions: (id: string) => ["finance", "exceptions", id] as const,
};

export function normalizeDashboardSummary(value: unknown): DashboardSummary {
  const root = asRecord(value);
  const reconciliations = asRecord(root.reconciliations);
  const byStatus = asRecord(reconciliations.byStatus);
  const exceptions = asRecord(root.exceptions);
  const imports = asRecord(root.imports);
  const transactions = asRecord(root.transactions);

  return {
    totalReconciliations: asNumber(reconciliations.total),
    inProgress:
      asNumber(byStatus.DRAFT) + asNumber(byStatus.IN_PROGRESS) + asNumber(byStatus.REOPENED),
    awaitingApproval: asNumber(byStatus.SUBMITTED) + asNumber(byStatus.READY_FOR_REVIEW),
    openExceptions: asNumber(exceptions.open),
    openExceptionAmount: asNullableAmount(exceptions.openAmount),
    pendingImports: asNumber(imports.pending),
    totalTransactions: asNumber(transactions.total),
  };
}

function normalizeReconciliation(value: unknown): ReconciliationListItem {
  const row = asRecord(value);
  const legalEntity = asRecord(row.legalEntity);
  const ledgerAccount = asRecord(row.ledgerAccount);
  const count = asRecord(row._count);
  const id = asString(row.id);
  const accountName = asString(ledgerAccount.name, asString(ledgerAccount.code));

  return {
    id,
    name: asString(row.name, accountName || id),
    legalEntityName: asString(legalEntity.name, asString(legalEntity.code)),
    accountName,
    accountCode: asString(ledgerAccount.code),
    currency: asString(row.currency, asString(ledgerAccount.currency)),
    periodStart: asString(row.periodStart),
    periodEnd: asString(row.periodEnd),
    status: asString(row.status),
    exceptionCount: asNumber(count.exceptions),
    importCount: asNumber(count.importBatches),
    updatedAt: asString(row.updatedAt),
  };
}

export function normalizeReconciliationList(value: unknown): ReconciliationList {
  const root = asRecord(value);
  return {
    items: Array.isArray(root.items) ? root.items.map(normalizeReconciliation) : [],
    nextCursor: asString(root.nextCursor) || null,
  };
}

export function normalizeReconciliationDetail(value: unknown): ReconciliationDetail {
  const root = asRecord(value);
  const count = asRecord(root._count);
  const events = Array.isArray(root.events) ? root.events : [];

  return {
    ...normalizeReconciliation(root),
    openingBalance: asNullableAmount(root.openingBalance),
    closingBalance: asNullableAmount(root.closingBalance),
    statementBalance: asNullableAmount(root.statementBalance),
    reconciledBalance: asNullableAmount(root.reconciledBalance),
    transactionCount: asNumber(count.transactions),
    matchGroupCount: asNumber(count.matchGroups),
    activity: events.map((value) => {
      const event = asRecord(value);
      return {
        id: asString(event.id),
        action: asString(event.eventType, asString(event.type)),
        fromStatus: asString(event.fromStatus) || null,
        toStatus: asString(event.toStatus) || null,
        createdAt: asString(event.createdAt, asString(event.occurredAt)),
      };
    }),
  };
}

export function reconciliationId(value: unknown): string {
  return asString(asRecord(value).id);
}

export function normalizeExceptionList(value: unknown): ExceptionList {
  const root = asRecord(value);
  return {
    items: Array.isArray(root.items)
      ? root.items.map((value) => {
          const row = asRecord(value);
          return {
            id: asString(row.id),
            type: asString(row.type),
            title: asString(row.title),
            detail: asString(row.detail) || null,
            severity: asString(row.severity),
            status: asString(row.status),
            assignedToId: asString(row.assignedToId) || null,
            createdAt: asString(row.createdAt),
          };
        })
      : [],
    nextCursor: asString(root.nextCursor) || null,
  };
}

export function formatCurrency(value: number | string, currency: string, locale: string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount)) return String(value);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)}`;
  }
}

export function titleCaseStatus(status: string): string {
  return status.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
