import type { ToolSchema } from "./gateway";
import { t } from "./i18n";
import {
  findCells,
  getSelection,
  listSheets,
  readCells,
  readRange,
  readUsedRange,
  setPreviewActiveSheet,
  writeCells,
  type CellEdit,
} from "./office";

/**
 * What the agent can do, and the only thing it knows about this workbook.
 *
 * The descriptions here are the agent's entire briefing — there is no domain
 * knowledge in the system prompt and none in these strings either. They say what
 * each call returns and nothing about what a sheet might contain, which is the
 * point: the agent has to look.
 *
 * Read tools run the moment the model asks for them. Write tools do not run
 * here at all — `previewEdits` turns their arguments into a diff the person
 * approves, and Panel calls `applyEdits` if they do.
 */

export type PendingEdit = {
  sheet: string | null;
  ref: string;
  current: string;
  next: string;
};

export type ToolSpec = {
  name: string;
  write: boolean;
  schema: ToolSchema;
  /** One line for the tool row in the thread, before the call runs. */
  label(args: Record<string, unknown>): string;
  /** One line for the same row once it has returned. Read tools only. */
  summary?(result: unknown): string;
  run?(args: Record<string, unknown>): Promise<unknown>;
};

function str(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dims(values: unknown): string {
  const grid = Array.isArray(values) ? (values as unknown[][]) : [];
  return `${String(grid.length)}×${String(grid[0]?.length ?? 0)}`;
}

const readTools: ToolSpec[] = [
  {
    name: "list_sheets",
    write: false,
    schema: {
      type: "function",
      function: {
        name: "list_sheets",
        description:
          "List every worksheet in the workbook with its used-range address and size, and which one is currently active. Call this first when you do not know what the workbook contains.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    label: () => t("tool.list_sheets"),
    summary: (result) => t("tool.list_sheets.done", { count: (result as unknown[]).length }),
    run: async () => listSheets(),
  },
  {
    name: "read_used_range",
    write: false,
    schema: {
      type: "function",
      function: {
        name: "read_used_range",
        description:
          "Read every cell a worksheet actually uses, as a 2D array of values with the first row exactly as it appears in the sheet. The fastest way to see a whole sheet. Results are capped; check the `truncated` flag.",
        parameters: {
          type: "object",
          properties: {
            sheet: {
              type: "string",
              description: "Worksheet name. Omit for the active sheet.",
            },
          },
          required: [],
        },
      },
    },
    label: (args) => t("tool.read_used_range", { sheet: str(args, "sheet") ?? t("tool.activeSheet") }),
    summary: (result) => {
      const data = result as { sheet: string; address: string; values: unknown[][] };
      return t("tool.read.done", {
        target: data.address ? `${data.sheet}!${data.address}` : data.sheet,
        dims: dims(data.values),
      });
    },
    run: async (args) => {
      const sheet = str(args, "sheet");
      if (sheet) setPreviewActiveSheet(sheet);
      return readUsedRange(sheet);
    },
  },
  {
    name: "read_range",
    write: false,
    schema: {
      type: "function",
      function: {
        name: "read_range",
        description:
          "Read a specific A1 range, e.g. 'B2:D40'. Use when you already know where to look. Set include_formulas to see formulas instead of only their results.",
        parameters: {
          type: "object",
          properties: {
            range: {
              type: "string",
              description: "A1 range, optionally sheet-qualified: 'C1:C50' or 'Sheet2!C1:C50'.",
            },
            sheet: { type: "string", description: "Worksheet name. Omit for the active sheet." },
            include_formulas: { type: "boolean", description: "Also return each cell's formula." },
          },
          required: ["range"],
        },
      },
    },
    label: (args) => t("tool.read_range", { range: str(args, "range") ?? "?" }),
    summary: (result) => {
      const data = result as { sheet: string; address: string; values: unknown[][] };
      return t("tool.read.done", {
        target: `${data.sheet}!${data.address}`,
        dims: dims(data.values),
      });
    },
    run: async (args) => {
      const range = str(args, "range");
      if (!range) throw new Error("`range` is required.");
      return readRange(str(args, "sheet"), range, args.include_formulas === true);
    },
  },
  {
    name: "get_selection",
    write: false,
    schema: {
      type: "function",
      function: {
        name: "get_selection",
        description:
          "Read the range the person currently has selected in Excel, with its address and values. Use this when they say 'this', 'here' or 'the selection'. If the result carries preview:true there is no real selection and the range is a stand-in — say so rather than reporting it as their selection.",
        parameters: { type: "object", properties: {}, required: [] },
      },
    },
    label: () => t("tool.get_selection"),
    summary: (result) => {
      const data = result as { sheet: string; address: string; values: unknown[][] };
      return t("tool.read.done", {
        target: `${data.sheet}!${data.address}`,
        dims: dims(data.values),
      });
    },
    run: async () => getSelection(),
  },
  {
    name: "find_cells",
    write: false,
    schema: {
      type: "function",
      function: {
        name: "find_cells",
        description:
          "Find cells whose text contains a substring, case-insensitively, and return their references and values. Searches one sheet, or the whole workbook when sheet is omitted.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Text to look for." },
            sheet: { type: "string", description: "Worksheet name. Omit to search all sheets." },
          },
          required: ["query"],
        },
      },
    },
    label: (args) => t("tool.find_cells", { query: str(args, "query") ?? "" }),
    summary: (result) => t("tool.find_cells.done", { count: (result as unknown[]).length }),
    run: async (args) => {
      const query = str(args, "query");
      if (!query) throw new Error("`query` is required.");
      return findCells(query, str(args, "sheet"));
    },
  },
];

const writeTools: ToolSpec[] = [
  {
    name: "write_cells",
    write: true,
    schema: {
      type: "function",
      function: {
        name: "write_cells",
        description:
          "Propose writing literal values into cells. The person sees every edit and must approve it before anything reaches the workbook, so state plainly what you are changing and why. If the result says applied:false they declined — accept it and do not retry the same edit.",
        parameters: {
          type: "object",
          properties: {
            edits: {
              type: "array",
              description: "The cells to change.",
              items: {
                type: "object",
                properties: {
                  ref: { type: "string", description: "Single cell, e.g. 'C7' or 'Sheet2!C7'." },
                  sheet: { type: "string", description: "Worksheet name if ref is unqualified." },
                  value: { type: "string", description: "The new value as text." },
                },
                required: ["ref", "value"],
              },
            },
          },
          required: ["edits"],
        },
      },
    },
    label: (args) =>
      t("tool.write_cells", { count: Array.isArray(args.edits) ? args.edits.length : 0 }),
  },
  {
    name: "write_formula",
    write: true,
    schema: {
      type: "function",
      function: {
        name: "write_formula",
        description:
          "Propose writing an Excel formula into one cell. Same approval rule as write_cells. The formula must start with '='.",
        parameters: {
          type: "object",
          properties: {
            ref: { type: "string", description: "Single cell, e.g. 'F9' or 'Sheet2!F9'." },
            sheet: { type: "string", description: "Worksheet name if ref is unqualified." },
            formula: { type: "string", description: "Formula starting with '=', e.g. '=SUM(D2:D9)'." },
          },
          required: ["ref", "formula"],
        },
      },
    },
    label: (args) => t("tool.write_formula", { ref: str(args, "ref") ?? "?" }),
  },
];

export const TOOLS: ToolSpec[] = [...readTools, ...writeTools];

export function toolSchemas(): ToolSchema[] {
  return TOOLS.map((tool) => tool.schema);
}

export function findTool(name: string): ToolSpec | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Turn a write call's arguments into the diff the person approves.
 *
 * Reads the cells first so the preview can show what is there now — an edit
 * that overwrites something is a different decision from one that fills a
 * blank, and the row says which.
 */
export async function previewEdits(
  name: string,
  args: Record<string, unknown>,
): Promise<PendingEdit[]> {
  const raw: { sheet: string | null; ref: string; next: string }[] = [];

  if (name === "write_formula") {
    const ref = str(args, "ref");
    const formula = str(args, "formula");
    if (!ref || !formula) throw new Error("`ref` and `formula` are required.");
    raw.push({
      sheet: str(args, "sheet"),
      ref,
      next: formula.startsWith("=") ? formula : `=${formula}`,
    });
  } else {
    const edits = Array.isArray(args.edits) ? (args.edits as Record<string, unknown>[]) : [];
    if (edits.length === 0) throw new Error("`edits` must contain at least one cell.");
    for (const edit of edits) {
      const ref = str(edit, "ref");
      if (!ref) continue;
      raw.push({ sheet: str(edit, "sheet"), ref, next: cellText(edit.value) });
    }
  }

  if (raw.length === 0) throw new Error("No usable cell reference in the request.");

  const current = await readCells(raw);
  return raw.map((edit, index) => ({
    sheet: edit.sheet,
    ref: edit.ref,
    current: cellText(current[index]),
    next: edit.next,
  }));
}

export async function applyEdits(edits: PendingEdit[]): Promise<void> {
  const payload: CellEdit[] = edits.map((edit) => ({
    sheet: edit.sheet,
    ref: edit.ref,
    value: edit.next,
  }));
  await writeCells(payload);
}
