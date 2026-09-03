import { getLocale } from "./i18n";

/**
 * The sidepanel agent, running entirely in the browser.
 *
 * Same shape the server version had: a deterministic pass over the sheet
 * excerpt that never fabricates — every issue carries a cell reference and,
 * when one exists, the exact value to write back — plus an optional LLM pass
 * through Vercel AI Gateway for free-text questions. No key configured, no
 * network, or a blocked request all degrade to checks-only; the UI labels the
 * turn's source either way.
 */

export type AddinIssue = {
  /** Excel A1 reference of the offending cell, header row = row 1. */
  ref: string;
  /** 1-based sheet row number. */
  row: number;
  /** Header text of the offending column, as the sheet spells it. */
  header: string;
  /** Stable check code, rendered by the i18n dictionary. */
  code: string;
  severity: "ERROR" | "WARNING";
  /** The value a fix would write back, when a fix exists. */
  expected: string | null;
};

export type AddinStep = {
  key: string;
  params?: Record<string, string | number>;
  ms: number;
};

export type AddinAgentBody = {
  intent: "validate" | "summarize" | "ask" | "fallback";
  params: Record<string, string | number>;
  steps: AddinStep[];
  issues: AddinIssue[];
  /** LLM prose, present only when the gateway answered. */
  answer: string | null;
  source: "script" | "llm";
};

export type SheetInput = {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
};

/** Bilingual header vocabulary, checked in order. */
const COLUMN_MATCHERS: { field: string; pattern: RegExp }[] = [
  { field: "invoice", pattern: /(nomor\s*faktur|no\.?\s*faktur|invoice\s*(no|number)?|faktur)/i },
  { field: "customer", pattern: /(lawan\s*transaksi|customer|buyer|pembeli)/i },
  { field: "npwp", pattern: /(npwp|tin\b|tax\s*id)/i },
  { field: "date", pattern: /(tanggal|tgl\b|date)/i },
  { field: "dpp", pattern: /(dpp|base\s*amount|nilai\s*dpp|jumlah\s*dpp)/i },
  { field: "ppn", pattern: /(^|[^a-z])ppn([^a-z]|$)|\bvat\b/i },
];

function columnLetter(index: number): string {
  let letter = "";
  let n = index;
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

function cellText(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/gu, "");
}

/**
 * Sheet numbers arrive the way people type them: "1.250.000,50" or "1,250,000.50".
 * Normalize both to a float — separators thousands-group unless they are the
 * decimal comma immediately followed by 1–2 digits.
 */
function parseAmount(value: string | number | boolean | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = cellText(value);
  if (!raw) return null;
  const cleaned = raw.replace(/[rp$]\s*/giu, "").replace(/\s/gu, "");
  const normalized =
    /^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(cleaned)
      ? cleaned.replace(/[.,](?=\d{3}\b)/gu, "").replace(",", ".")
      : cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function stepMs(base: number, rows: number) {
  return base + Math.min(rows, 400) * 7;
}

function matchIntent(question: string): AddinAgentBody["intent"] {
  // "valida" covers validate/validating and Indonesian "validasi" alike.
  if (/(valida|cek|check|periksa|issues?|error|salah|npwp|ppn|faktur|pajak)/iu.test(question)) {
    return "validate";
  }
  if (/(summar|ringkas|overview|status|recap|rekap)/iu.test(question)) {
    return "summarize";
  }
  return "ask";
}

function detectColumns(headers: string[]) {
  const map = new Map<string, number>();
  headers.forEach((header, index) => {
    for (const { field, pattern } of COLUMN_MATCHERS) {
      if (!map.has(field) && pattern.test(header)) {
        map.set(field, index);
        break;
      }
    }
  });
  return map;
}

function runChecks(sheet: SheetInput): { issues: AddinIssue[]; columns: Map<string, number> } {
  const issues: AddinIssue[] = [];
  const columns = detectColumns(sheet.headers);

  const invoiceColumn = columns.get("invoice");
  const npwpColumn = columns.get("npwp");
  const dppColumn = columns.get("dpp");
  const ppnColumn = columns.get("ppn");
  const dateColumn = columns.get("date");

  const seenInvoices = new Map<string, number>();

  sheet.rows.forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2; // header is row 1
    const ref = (index: number) => `${columnLetter(index)}${rowNumber}`;

    for (const field of ["invoice", "npwp", "dpp"] as const) {
      const index = columns.get(field);
      if (index !== undefined && !cellText(row[index])) {
        issues.push({
          ref: ref(index),
          row: rowNumber,
          header: sheet.headers[index] ?? "",
          code: `missing_${field}`,
          severity: "ERROR",
          expected: null,
        });
      }
    }

    if (npwpColumn !== undefined) {
      const npwp = digitsOnly(cellText(row[npwpColumn]));
      if (npwp && npwp.length !== 15 && npwp.length !== 16) {
        issues.push({
          ref: ref(npwpColumn),
          row: rowNumber,
          header: sheet.headers[npwpColumn] ?? "",
          code: "bad_npwp",
          severity: "ERROR",
          // A truncated NPWP cannot be auto-completed — the real value has to
          // come from the user.
          expected: null,
        });
      }
    }

    if (dppColumn !== undefined) {
      const dpp = parseAmount(row[dppColumn]);
      if (dpp !== null && dpp <= 0) {
        issues.push({
          ref: ref(dppColumn),
          row: rowNumber,
          header: sheet.headers[dppColumn] ?? "",
          code: "non_positive_dpp",
          severity: "ERROR",
          expected: null,
        });
      }
    }

    if (dppColumn !== undefined && ppnColumn !== undefined) {
      const dpp = parseAmount(row[dppColumn]);
      const ppn = parseAmount(row[ppnColumn]);
      if (dpp !== null && dpp > 0 && ppn !== null) {
        const expectedPpn = Math.round(dpp * 0.11 * 100) / 100;
        if (Math.abs(ppn - expectedPpn) > 1) {
          issues.push({
            ref: ref(ppnColumn),
            row: rowNumber,
            header: sheet.headers[ppnColumn] ?? "",
            code: "vat_mismatch",
            severity: "WARNING",
            expected: String(expectedPpn),
          });
        }
      }
    }

    if (dateColumn !== undefined) {
      const raw = cellText(row[dateColumn]);
      if (raw && !parseAmount(raw)) {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) {
          issues.push({
            ref: ref(dateColumn),
            row: rowNumber,
            header: sheet.headers[dateColumn] ?? "",
            code: "bad_date",
            severity: "WARNING",
            expected: null,
          });
        }
      }
    }

    if (invoiceColumn !== undefined) {
      const invoice = cellText(row[invoiceColumn]).toUpperCase();
      if (invoice) {
        const firstRow = seenInvoices.get(invoice);
        if (firstRow !== undefined) {
          issues.push({
            ref: ref(invoiceColumn),
            row: rowNumber,
            header: sheet.headers[invoiceColumn] ?? "",
            code: "duplicate_invoice",
            severity: "WARNING",
            expected: null,
          });
        } else {
          seenInvoices.set(invoice, rowNumber);
        }
      }
    }
  });

  return { issues, columns };
}

export async function runAgent(question: string, sheet: SheetInput): Promise<AddinAgentBody> {
  const { consultModel } = await import("./ai");
  const locale = getLocale();
  const intent = matchIntent(question);
  const rowCount = sheet.rows.length;
  const baseParams = { rows: rowCount, columns: sheet.headers.length };
  const { issues, columns } = runChecks(sheet);

  if (intent === "ask" || intent === "summarize") {
    const steps: AddinStep[] = [
      { key: "read_sheet", params: baseParams, ms: stepMs(120, rowCount) },
      { key: "map_columns", params: { mapped: columns.size }, ms: 90 + columns.size * 5 },
    ];
    const answer = await consultModel({ question, sheet, locale, issues });
    steps.push(answer ? { key: "consult_model", ms: 640 } : { key: "script_only", ms: 60 });
    return {
      intent,
      params: answer ? baseParams : { ...baseParams, note: "no_model" },
      steps,
      issues: [],
      answer,
      source: answer ? "llm" : "script",
    };
  }

  const steps: AddinStep[] = [
    { key: "read_sheet", params: baseParams, ms: stepMs(120, rowCount) },
    { key: "map_columns", params: { mapped: columns.size }, ms: 90 + columns.size * 5 },
    { key: "check_rows", params: { issues: issues.length }, ms: stepMs(210, rowCount) },
  ];

  const answer = await consultModel({ question, sheet, locale, issues });
  if (answer) steps.push({ key: "consult_model", ms: 640 });

  return {
    intent: "validate",
    params: {
      ...baseParams,
      issues: issues.length,
      errors: issues.filter((issue) => issue.severity === "ERROR").length,
    },
    steps,
    issues,
    answer,
    source: answer ? "llm" : "script",
  };
}
