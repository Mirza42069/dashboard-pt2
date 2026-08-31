import { financeDatabase, type FinanceDatabase } from "./finance-database";

/**
 * The scripted agent.
 *
 * There is no model behind this and it does not pretend otherwise: an ordered
 * table of intents, matched on the message, each one answered from the
 * organization's real records. What makes a run read as genuine is that every
 * number in it is true — the transaction counts, the open exceptions and the
 * balances all come from the database this organization actually holds.
 *
 * Two rules hold the whole file together:
 *
 *   1. **It never writes.** An agent that posted fictional journal entries into
 *      real reconciliations would be worse than no agent. Every query here is a
 *      read.
 *   2. **It never returns prose.** A turn is an intent, its parameters, and a
 *      list of step keys. The client renders the words from `t.agent.*`, which
 *      is how a thread written in English still reads in Indonesian, and how a
 *      wording fix reaches threads that already exist. ActivityLog and
 *      activity-popover.svelte already work this way.
 */

export type AgentStep = {
  /** Looked up in `t.agent.steps`. */
  key: string;
  params?: Record<string, string | number>;
  /**
   * How long the step "took", in milliseconds.
   *
   * Derived from the row counts rather than random, so the same run reports the
   * same duration every time it is read back. A timeline that reshuffles on
   * refresh tells the reader the whole thing is theatre.
   */
  ms: number;
};

export type AgentResult =
  | { kind: "none" }
  | {
      kind: "reconciliation";
      reconciliationId: string;
      name: string;
      status: string;
      currency: string;
      periodStart: string;
      periodEnd: string;
      transactions: number;
      exceptions: number;
      statementBalance: string | null;
      reconciledBalance: string | null;
    }
  | {
      kind: "exceptions";
      items: {
        id: string;
        title: string;
        severity: string;
        type: string;
        amount: string | null;
        reconciliationName: string;
      }[];
      total: number;
    }
  | {
      kind: "periods";
      items: { id: string; name: string; status: string; exceptions: number }[];
      total: number;
    }
  | {
      kind: "transactions";
      items: {
        id: string;
        description: string;
        counterparty: string | null;
        amount: string;
        currency: string;
        effectiveDate: string;
      }[];
      total: number;
    };

export type AgentBody = {
  intent: string;
  params: Record<string, string | number>;
  steps: AgentStep[];
  result: AgentResult;
};

export type UserAttachment = { name: string; sizeBytes: number; type: string };
export type UserBody = { text: string; attachments: UserAttachment[] };

/** Every intent the script can answer. `fallback` is not matched, only reached. */
export const AGENT_INTENTS = [
  "reconcile_account",
  "open_exceptions",
  "close_status",
  "large_items",
  "fallback",
] as const;

export type AgentIntent = (typeof AGENT_INTENTS)[number];

/**
 * Ordered because the patterns overlap on purpose: "reconcile the account and
 * show me what didn't tie" is a reconciliation request that happens to mention
 * exceptions, and the first match should win.
 *
 * Both languages in one pattern rather than a dictionary lookup — the matcher
 * runs on the server, where the reader's locale is a client concern, and
 * somebody typing Indonesian into an English UI should still be understood.
 */
const MATCHERS: { intent: Exclude<AgentIntent, "fallback">; pattern: RegExp }[] = [
  {
    intent: "large_items",
    pattern: /\b(over|above|larger than|greater than|more than|di atas|lebih dari)\b/i,
  },
  {
    intent: "reconcile_account",
    pattern:
      /\b(reconciles?|reconciled|reconciling|reconciliations?|tie ?outs?|match(?:ed|es|ing)?|rekonsiliasi|cocokkan)\b/i,
  },
  {
    // Inflections are spelled out rather than dropping the closing \b: without
    // it "breakfast" becomes an exception request, and this matcher decides
    // which work gets run.
    intent: "open_exceptions",
    pattern:
      /\b(exceptions?|breaks?|unmatched|discrepanc(?:y|ies)|differences?|selisih|pengecualian)\b/i,
  },
  {
    intent: "close_status",
    pattern:
      /\b(status|close[sd]?|closing|progress|where are we|overview|tutup|penutupan|kemajuan)\b/i,
  },
];

export function matchIntent(message: string): AgentIntent {
  for (const { intent, pattern } of MATCHERS) {
    if (pattern.test(message)) return intent;
  }
  return "fallback";
}

/**
 * A money threshold written the way people write it — "over $10,000", "di atas
 * 5.000". Both separators are accepted because the product runs in two locales
 * and the number here is a filter, not an amount being posted.
 */
export function parseThreshold(message: string): number | null {
  const match = message.match(/(?:over|above|larger than|greater than|more than|di atas|lebih dari)\s*[^\d]{0,3}([\d.,]+)/i);
  const captured = match?.[1];
  if (!captured) return null;
  const digits = captured.replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
  const value = Number(digits);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** A thread's title: the opening question, trimmed to something a row can hold. */
export function titleFromMessage(message: string): string {
  const clean = message.trim().replace(/\s+/gu, " ");
  if (clean.length <= 60) return clean || "Untitled";
  return `${clean.slice(0, 59).trimEnd()}…`;
}

/** Plausible, monotonic, and a pure function of the work reported. */
function stepMs(base: number, rows: number) {
  return base + Math.min(rows, 400) * 7;
}

function isoDate(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : "";
}

function decimalString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

/**
 * Runs the matched intent against the organization's data.
 *
 * Takes the raw database rather than a narrowed client because it reaches
 * across five models; every call is a read.
 */
export async function runAgent(
  rawDatabase: unknown,
  input: { organizationId: string; message: string; reconciliationId?: string },
): Promise<AgentBody> {
  const database: FinanceDatabase = financeDatabase(rawDatabase);
  const { organizationId, message, reconciliationId } = input;
  const intent = matchIntent(message);

  if (intent === "reconcile_account") {
    // If the message names an account the organization actually holds, work on
    // that one. Otherwise take the period most in need of attention.
    const accounts = await database.ledgerAccount.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
    });
    const named = accounts.find((account) =>
      message.toLocaleLowerCase().includes(account.name.toLocaleLowerCase()),
    );

    const reconciliation = await database.reconciliation.findFirst({
      where: {
        organizationId,
        ...(reconciliationId ? { id: reconciliationId } : named ? { ledgerAccountId: named.id } : {}),
        status: { in: ["DRAFT", "IN_PROGRESS", "READY_FOR_REVIEW", "REOPENED", "SUBMITTED"] },
      },
      include: {
        _count: {
          select: {
            transactions: true,
            exceptions: { where: { status: { in: ["OPEN", "IN_REVIEW"] } } },
          },
        },
      },
      orderBy: [{ periodEnd: "desc" }],
    });

    if (!reconciliation) {
      return {
        intent: "reconcile_account",
        params: { account: named?.name ?? "" },
        steps: [{ key: "searched_periods", ms: 240 }],
        result: { kind: "none" },
      };
    }

    const transactions = reconciliation._count.transactions;
    const exceptions = reconciliation._count.exceptions;
    return {
      intent: "reconcile_account",
      params: {
        account: reconciliation.name,
        transactions,
        exceptions,
        matched: Math.max(transactions - exceptions, 0),
      },
      steps: [
        { key: "pulled_statement", params: { lines: transactions }, ms: stepMs(310, transactions) },
        { key: "matched_ledger", params: { matched: Math.max(transactions - exceptions, 0) }, ms: stepMs(620, transactions) },
        { key: "flagged_breaks", params: { count: exceptions }, ms: stepMs(180, exceptions) },
        { key: "prepared_summary", ms: 210 },
      ],
      result: {
        kind: "reconciliation",
        reconciliationId: reconciliation.id,
        name: reconciliation.name,
        status: String(reconciliation.status),
        currency: reconciliation.currency,
        periodStart: isoDate(reconciliation.periodStart),
        periodEnd: isoDate(reconciliation.periodEnd),
        transactions,
        exceptions,
        statementBalance: decimalString(reconciliation.statementBalance),
        reconciledBalance: decimalString(reconciliation.reconciledBalance),
      },
    };
  }

  if (intent === "open_exceptions") {
    const [rows, total] = await Promise.all([
      database.reconciliationException.findMany({
        where: { organizationId, status: "OPEN" },
        include: { reconciliation: { select: { name: true } } },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 8,
      }),
      database.reconciliationException.count({ where: { organizationId, status: "OPEN" } }),
    ]);

    return {
      intent: "open_exceptions",
      params: { total, shown: rows.length },
      steps: [
        { key: "scanned_periods", ms: stepMs(280, total) },
        { key: "grouped_breaks", params: { count: total }, ms: stepMs(190, total) },
      ],
      result: {
        kind: "exceptions",
        total,
        items: rows.map((row) => ({
          id: row.id,
          title: row.title,
          severity: String(row.severity),
          type: String(row.type),
          amount: decimalString(row.amount),
          reconciliationName: row.reconciliation.name,
        })),
      },
    };
  }

  if (intent === "close_status") {
    const [rows, total, outstanding] = await Promise.all([
      database.reconciliation.findMany({
        where: { organizationId },
        include: { _count: { select: { exceptions: true } } },
        orderBy: [{ periodEnd: "desc" }],
        take: 8,
      }),
      database.reconciliation.count({ where: { organizationId } }),
      // Counted across every period, not across the eight rows shown.
      // Filtering the sample and reporting it against the full total says
      // "7 of 12" when the truth is "7 of the 8 I looked at" — a sentence that
      // is right only while an organization has fewer periods than the page
      // size, which is exactly the condition a demo satisfies and production
      // does not.
      database.reconciliation.count({
        where: { organizationId, status: { notIn: ["APPROVED", "COMPLETED"] } },
      }),
    ]);

    return {
      intent: "close_status",
      params: { total, outstanding },
      steps: [
        { key: "read_calendar", params: { periods: total }, ms: stepMs(240, total) },
        { key: "checked_workflow", ms: stepMs(200, total) },
      ],
      result: {
        kind: "periods",
        total,
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          status: String(row.status),
          exceptions: row._count.exceptions,
        })),
      },
    };
  }

  if (intent === "large_items") {
    const threshold = parseThreshold(message) ?? 10_000;
    // The threshold is money, so the client needs a currency to render it with.
    // Taking the organization's most common transaction currency would be more
    // correct and far more query for a filter label; the first account's is
    // right whenever an organization trades in one currency, which is all of
    // them here.
    const anyAccount = await database.ledgerAccount.findFirst({
      where: { organizationId },
      select: { currency: true },
      orderBy: { createdAt: "asc" },
    });
    const [rows, total] = await Promise.all([
      database.transaction.findMany({
        where: { organizationId, amount: { gte: threshold } },
        orderBy: [{ amount: "desc" }],
        take: 8,
      }),
      database.transaction.count({ where: { organizationId, amount: { gte: threshold } } }),
    ]);

    return {
      intent: "large_items",
      params: { threshold, total, currency: anyAccount?.currency ?? "USD" },
      steps: [
        { key: "swept_ledger", params: { threshold }, ms: stepMs(320, total) },
        { key: "ranked_items", params: { count: total }, ms: stepMs(170, total) },
      ],
      result: {
        kind: "transactions",
        total,
        items: rows.map((row) => ({
          id: row.id,
          description: row.description,
          counterparty: row.counterparty,
          amount: String(row.amount),
          currency: row.currency,
          effectiveDate: isoDate(row.effectiveDate),
        })),
      },
    };
  }

  // Nothing matched. Say what this can do rather than inventing a result — a
  // confident wrong answer is the one failure mode a finance tool cannot have.
  return {
    intent: "fallback",
    params: {},
    steps: [],
    result: { kind: "none" },
  };
}
