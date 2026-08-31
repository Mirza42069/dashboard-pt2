import type { Dictionary } from "../i18n";
import { interpolate, plural } from "../i18n";

/**
 * Reading a stored turn.
 *
 * A turn arrives from the API as `Json` — the column is untyped by design, so
 * the shape has to be re-established here rather than trusted, the same way
 * These guards re-establish the loosely-typed oRPC payloads.
 *
 * The important rule this file enforces is that the agent's words live in the
 * dictionary and nowhere else. Nothing below returns a hardcoded sentence; an
 * intent the dictionary has not caught up with falls through to `fallback`, so
 * an old thread degrades to a vaguer sentence rather than a blank turn.
 */

export type AgentStep = { key: string; params: Record<string, string | number>; ms: number };

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
      total: number;
      items: {
        id: string;
        title: string;
        severity: string;
        type: string;
        amount: string | null;
        reconciliationName: string;
      }[];
    }
  | {
      kind: "periods";
      total: number;
      items: { id: string; name: string; status: string; exceptions: number }[];
    }
  | {
      kind: "transactions";
      total: number;
      items: {
        id: string;
        description: string;
        counterparty: string | null;
        amount: string;
        currency: string;
        effectiveDate: string;
      }[];
    };

export type AgentBody = {
  intent: string;
  params: Record<string, string | number>;
  steps: AgentStep[];
  result: AgentResult;
};

export type UserAttachment = { name: string; sizeBytes: number; type: string };
export type UserBody = { text: string; attachments: UserAttachment[] };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asParams(value: unknown): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).filter(
      (entry): entry is [string, string | number] =>
        typeof entry[1] === "string" || typeof entry[1] === "number",
    ),
  );
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function normalizeUserBody(value: unknown): UserBody {
  const root = asRecord(value);
  return {
    text: asString(root.text),
    attachments: asArray(root.attachments).map((item) => {
      const row = asRecord(item);
      return {
        name: asString(row.name),
        sizeBytes: asNumber(row.sizeBytes),
        type: asString(row.type),
      };
    }),
  };
}

function normalizeResult(value: unknown): AgentResult {
  const root = asRecord(value);
  const kind = asString(root.kind, "none");

  if (kind === "reconciliation") {
    return {
      kind,
      reconciliationId: asString(root.reconciliationId),
      name: asString(root.name),
      status: asString(root.status),
      currency: asString(root.currency),
      periodStart: asString(root.periodStart),
      periodEnd: asString(root.periodEnd),
      transactions: asNumber(root.transactions),
      exceptions: asNumber(root.exceptions),
      statementBalance: typeof root.statementBalance === "string" ? root.statementBalance : null,
      reconciledBalance: typeof root.reconciledBalance === "string" ? root.reconciledBalance : null,
    };
  }
  if (kind === "exceptions") {
    return {
      kind,
      total: asNumber(root.total),
      items: asArray(root.items).map((item) => {
        const row = asRecord(item);
        return {
          id: asString(row.id),
          title: asString(row.title),
          severity: asString(row.severity),
          type: asString(row.type),
          amount: typeof row.amount === "string" ? row.amount : null,
          reconciliationName: asString(row.reconciliationName),
        };
      }),
    };
  }
  if (kind === "periods") {
    return {
      kind,
      total: asNumber(root.total),
      items: asArray(root.items).map((item) => {
        const row = asRecord(item);
        return {
          id: asString(row.id),
          name: asString(row.name),
          status: asString(row.status),
          exceptions: asNumber(row.exceptions),
        };
      }),
    };
  }
  if (kind === "transactions") {
    return {
      kind,
      total: asNumber(root.total),
      items: asArray(root.items).map((item) => {
        const row = asRecord(item);
        return {
          id: asString(row.id),
          description: asString(row.description),
          counterparty: typeof row.counterparty === "string" ? row.counterparty : null,
          amount: asString(row.amount, "0"),
          currency: asString(row.currency),
          effectiveDate: asString(row.effectiveDate),
        };
      }),
    };
  }
  return { kind: "none" };
}

export function normalizeAgentBody(value: unknown): AgentBody {
  const root = asRecord(value);
  return {
    intent: asString(root.intent, "fallback"),
    params: asParams(root.params),
    steps: asArray(root.steps).map((item) => {
      const row = asRecord(item);
      return { key: asString(row.key), params: asParams(row.params), ms: asNumber(row.ms) };
    }),
    result: normalizeResult(root.result),
  };
}

/** One step of the run timeline, in the reader's language. */
export function agentStepLabel(dict: Dictionary, step: AgentStep): string {
  const labels = dict.agent.stepLabels as Record<string, string | undefined>;
  const template = labels[step.key];
  return template ? interpolate(template, step.params) : step.key;
}

/**
 * What the agent says about the run.
 *
 * The variant chosen depends on the numbers, not on the intent alone: a
 * reconciliation with nothing outstanding should not report breaks it does not
 * have, and "0 exceptions are open" is a worse sentence than "nothing is open".
 * Those are different claims and the dictionary carries both.
 */
export function agentSentence(
  dict: Dictionary,
  body: AgentBody,
  format: { threshold: (value: number, currency: string) => string },
): string {
  const say = dict.agent.say;
  const { params, result } = body;

  switch (body.intent) {
    case "reconcile_account": {
      if (result.kind !== "reconciliation") {
        return interpolate(say.reconcile_account_none, params);
      }
      const template =
        result.exceptions === 0 ? say.reconcile_account_clean : say.reconcile_account;
      return interpolate(template, params);
    }
    case "open_exceptions": {
      const total = Number(params.total ?? 0);
      if (total === 0) return say.open_exceptions_none;
      return plural(say.open_exceptions, total);
    }
    case "close_status": {
      const outstanding = Number(params.outstanding ?? 0);
      const template = outstanding === 0 ? say.close_status_clean : say.close_status;
      return interpolate(template, params);
    }
    case "large_items": {
      const total = Number(params.total ?? 0);
      const threshold = format.threshold(
        Number(params.threshold ?? 0),
        String(params.currency ?? ""),
      );
      return plural(say.large_items, total, { threshold });
    }
    default:
      return say.fallback;
  }
}

/** The run's wall time, for the line under the step list. */
export function agentDurationSeconds(body: AgentBody): number {
  const total = body.steps.reduce((sum, step) => sum + step.ms, 0);
  return Math.round(total / 100) / 10;
}
