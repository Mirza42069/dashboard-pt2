import { t } from "./i18n";

/**
 * The Office.js boundary.
 *
 * Everything the agent can do to a workbook goes through this module, and every
 * operation exists twice behind one signature: a real Excel.run implementation,
 * and a mock over an in-memory workbook used when Office.js is absent — the pane
 * opened in a plain browser. That is what makes the whole agent demonstrable
 * before anything is sideloaded, and it is why the tool layer above never has to
 * ask which host it is on.
 *
 * Everything here stays inside ExcelApi 1.1 (`worksheets.items`, `getUsedRange`,
 * `getRange`, `getSelectedRange`, `values`, `formulas`), which is what the
 * manifest requires. Notably `find_cells` scans client-side rather than calling
 * `range.find`, which would drag the requirement set to 1.9 for no gain at this
 * size of sheet.
 */

export type CellValue = string | number | boolean | null;

export type SheetInfo = {
  name: string;
  /** Used-range address, e.g. "A1:E9". Empty string for an empty sheet. */
  address: string;
  rowCount: number;
  columnCount: number;
  active: boolean;
};

export type RangeData = {
  sheet: string;
  address: string;
  values: CellValue[][];
  formulas?: string[][];
  /** True when the read was capped and more data exists below or to the right. */
  truncated: boolean;
};

export type CellEdit = { sheet?: string | null; ref: string; value: string };

/**
 * Read caps.
 *
 * These exist to protect the model's context window, not Excel — a 5,000-row
 * sheet serialised whole would cost more than the answer is worth and would be
 * truncated by the API anyway. Every capped result is flagged `truncated` so the
 * agent knows to ask for more rather than assume it saw everything.
 */
const MAX_ROWS = 200;
const MAX_COLS = 40;
const MAX_CELL_CHARS = 200;

let host: "excel" | "browser" = "browser";

export function isInExcel(): boolean {
  return host === "excel";
}

export function sheetBadge(): string {
  return host === "excel" ? t("excelBadge") : t("previewBadge");
}

/** Resolves once Office.js is ready — or 4s after the CDN failed to load. */
export function initOffice(): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      host = "browser";
      resolve();
    }, 4_000);

    if (typeof Office === "undefined" || !Office.onReady) {
      return;
    }

    void Office.onReady((info) => {
      clearTimeout(timeout);
      host = info.host === Office.HostType.Excel ? "excel" : "browser";
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/* A1 addressing.                                                      */
/* ------------------------------------------------------------------ */

export function columnLetter(index: number): string {
  let letter = "";
  let n = index;
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

function columnIndex(letters: string): number {
  let index = 0;
  for (const letter of letters.toUpperCase()) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

/**
 * Split an address into its sheet part and its A1 part.
 *
 * Accepts "A1", "A1:C10", "Sheet1!A1:C10" and "'My Sheet'!A1". An explicit
 * sheet in the address wins over the `sheet` argument — the model tends to
 * qualify references once it has seen a sheet name, and honouring that is
 * cheaper than telling it not to.
 */
function splitAddress(address: string): { sheet: string | null; a1: string } {
  const bang = address.lastIndexOf("!");
  if (bang === -1) return { sheet: null, a1: address.trim() };
  const name = address.slice(0, bang).trim().replace(/^'|'$/gu, "").replace(/''/gu, "'");
  return { sheet: name || null, a1: address.slice(bang + 1).trim() };
}

type Box = { top: number; left: number; bottom: number; right: number };

/** Parse an A1 range into 0-based inclusive bounds. Null when unparseable. */
function parseA1(a1: string): Box | null {
  const cell = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/u;
  const [start, end] = a1.split(":");
  const first = cell.exec((start ?? "").trim());
  if (!first) return null;
  const top = Number(first[2]) - 1;
  const left = columnIndex(first[1] ?? "A");
  if (!end) return { top, left, bottom: top, right: left };
  const second = cell.exec(end.trim());
  if (!second) return null;
  const bottom = Number(second[2]) - 1;
  const right = columnIndex(second[1] ?? "A");
  return {
    top: Math.min(top, bottom),
    left: Math.min(left, right),
    bottom: Math.max(top, bottom),
    right: Math.max(left, right),
  };
}

function boxAddress(box: Box): string {
  return `${columnLetter(box.left)}${String(box.top + 1)}:${columnLetter(box.right)}${String(box.bottom + 1)}`;
}

/** Trim long strings so one runaway cell cannot dominate a tool result. */
function clampCell(value: CellValue): CellValue {
  if (typeof value !== "string" || value.length <= MAX_CELL_CHARS) return value;
  return `${value.slice(0, MAX_CELL_CHARS)}…`;
}

function clampGrid<T>(grid: T[][]): { grid: T[][]; truncated: boolean } {
  const truncated = grid.length > MAX_ROWS || grid.some((row) => row.length > MAX_COLS);
  return { grid: grid.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLS)), truncated };
}

/* ------------------------------------------------------------------ */
/* The browser-preview workbook.                                       */
/* ------------------------------------------------------------------ */

/**
 * A deliberately ordinary workbook.
 *
 * It carries no domain: the agent is supposed to arrive knowing nothing and
 * work the sheet out from what the tools return, so seeding this with a
 * recognisable document shape would be teaching it the answer. Two sheets so
 * `list_sheets` has something to say, one blank cell and one row where the
 * total does not match quantity × price, so there is something to find without
 * anything here naming it.
 */
const mockWorkbook: Record<string, CellValue[][]> = {
  Orders: [
    ["Order", "Region", "Rep", "Quantity", "Unit Price", "Total"],
    ["A-1001", "North", "Dana", 12, 45, 540],
    ["A-1002", "South", "Ravi", 8, 45, 360],
    ["A-1003", "North", "Dana", 30, 12.5, 375],
    ["A-1004", "East", "Mira", 5, 45, 225],
    ["A-1005", "South", null, 14, 45, 630],
    ["A-1006", "West", "Ravi", 22, 12.5, 250],
    ["A-1007", "North", "Mira", 9, 45, 405],
    ["A-1008", "East", "Dana", 17, 12.5, 212.5],
  ],
  Regions: [
    ["Region", "Manager", "Target"],
    ["North", "Dana", 1500],
    ["South", "Ravi", 1200],
    ["East", "Mira", 900],
    ["West", "Ravi", 700],
  ],
};

let mockActive = "Orders";
/** Stands in for the user's selection, which preview mode has no real notion of. */
const mockSelection = "A1:F3";

function mockSheet(name: string | null): { name: string; grid: CellValue[][] } {
  const resolved = name && name in mockWorkbook ? name : mockActive;
  return { name: resolved, grid: mockWorkbook[resolved] ?? [] };
}

function mockUsedBox(grid: CellValue[][]): Box {
  const right = grid.reduce((max, row) => Math.max(max, row.length), 0) - 1;
  return { top: 0, left: 0, bottom: Math.max(grid.length - 1, 0), right: Math.max(right, 0) };
}

function sliceGrid(grid: CellValue[][], box: Box): CellValue[][] {
  const out: CellValue[][] = [];
  for (let r = box.top; r <= box.bottom; r++) {
    const row: CellValue[] = [];
    for (let c = box.left; c <= box.right; c++) row.push(clampCell(grid[r]?.[c] ?? null));
    out.push(row);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Public surface — one signature, two implementations.                */
/* ------------------------------------------------------------------ */

export async function listSheets(): Promise<SheetInfo[]> {
  if (host !== "excel") {
    return Object.entries(mockWorkbook).map(([name, grid]) => {
      const box = mockUsedBox(grid);
      return {
        name,
        address: grid.length ? boxAddress(box) : "",
        rowCount: grid.length,
        columnCount: box.right + 1,
        active: name === mockActive,
      };
    });
  }

  return Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name");
    const active = sheets.getActiveWorksheet();
    active.load("name");
    await context.sync();

    const ranges = sheets.items.map((sheet) => {
      const used = sheet.getUsedRangeOrNullObject();
      used.load("address, rowCount, columnCount, isNullObject");
      return used;
    });
    await context.sync();

    return sheets.items.map((sheet, index) => {
      const used = ranges[index];
      const empty = !used || used.isNullObject;
      return {
        name: sheet.name,
        address: empty ? "" : splitAddress(used.address).a1,
        rowCount: empty ? 0 : used.rowCount,
        columnCount: empty ? 0 : used.columnCount,
        active: sheet.name === active.name,
      };
    });
  });
}

export async function readRange(
  sheet: string | null,
  address: string,
  includeFormulas = false,
): Promise<RangeData> {
  const target = splitAddress(address);
  const sheetName = target.sheet ?? sheet;

  if (host !== "excel") {
    const { name, grid } = mockSheet(sheetName);
    const box = parseA1(target.a1);
    if (!box) throw new Error(`Not a valid A1 range: ${address}`);
    const clamped = clampGrid(sliceGrid(grid, box));
    return {
      sheet: name,
      address: boxAddress(box),
      values: clamped.grid,
      ...(includeFormulas ? { formulas: clamped.grid.map((row) => row.map(String)) } : {}),
      truncated: clamped.truncated,
    };
  }

  return Excel.run(async (context) => {
    const worksheet = sheetName
      ? context.workbook.worksheets.getItem(sheetName)
      : context.workbook.worksheets.getActiveWorksheet();
    const range = worksheet.getRange(target.a1);
    range.load(includeFormulas ? "address, values, formulas" : "address, values");
    worksheet.load("name");
    await context.sync();

    const clamped = clampGrid((range.values ?? []) as CellValue[][]);
    return {
      sheet: worksheet.name,
      address: splitAddress(range.address).a1,
      values: clamped.grid.map((row) => row.map(clampCell)),
      ...(includeFormulas
        ? { formulas: clampGrid((range.formulas ?? []) as string[][]).grid }
        : {}),
      truncated: clamped.truncated,
    };
  });
}

export async function readUsedRange(sheet: string | null): Promise<RangeData> {
  if (host !== "excel") {
    const { name, grid } = mockSheet(sheet);
    const box = mockUsedBox(grid);
    const clamped = clampGrid(sliceGrid(grid, box));
    return {
      sheet: name,
      address: grid.length ? boxAddress(box) : "",
      values: clamped.grid,
      truncated: clamped.truncated,
    };
  }

  return Excel.run(async (context) => {
    const worksheet = sheet
      ? context.workbook.worksheets.getItem(sheet)
      : context.workbook.worksheets.getActiveWorksheet();
    const used = worksheet.getUsedRangeOrNullObject();
    used.load("address, values, isNullObject");
    worksheet.load("name");
    await context.sync();

    if (used.isNullObject) {
      return { sheet: worksheet.name, address: "", values: [], truncated: false };
    }
    const clamped = clampGrid((used.values ?? []) as CellValue[][]);
    return {
      sheet: worksheet.name,
      address: splitAddress(used.address).a1,
      values: clamped.grid.map((row) => row.map(clampCell)),
      truncated: clamped.truncated,
    };
  });
}

export async function getSelection(): Promise<RangeData & { preview?: true }> {
  if (host !== "excel") {
    const { name, grid } = mockSheet(null);
    const box = parseA1(mockSelection);
    if (!box) return { sheet: name, address: "", values: [], truncated: false, preview: true };
    return {
      sheet: name,
      address: mockSelection,
      values: sliceGrid(grid, box),
      truncated: false,
      // Flagged so the agent does not report a stand-in as the real selection.
      preview: true,
    };
  }

  return Excel.run(async (context) => {
    const range = context.workbook.getSelectedRange();
    range.load("address, values");
    await context.sync();

    const { sheet, a1 } = splitAddress(range.address);
    const clamped = clampGrid((range.values ?? []) as CellValue[][]);
    return {
      sheet: sheet ?? "",
      address: a1,
      values: clamped.grid.map((row) => row.map(clampCell)),
      truncated: clamped.truncated,
    };
  });
}

export type FoundCell = { sheet: string; ref: string; value: CellValue };

/** Case-insensitive substring scan of a sheet's used range, or of every sheet. */
export async function findCells(
  query: string,
  sheet: string | null,
  limit = 50,
): Promise<FoundCell[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const sheets = sheet ? [sheet] : (await listSheets()).map((info) => info.name);
  const hits: FoundCell[] = [];

  for (const name of sheets) {
    const data = await readUsedRange(name);
    const origin = parseA1(data.address.split(":")[0] ?? "A1") ?? { top: 0, left: 0, bottom: 0, right: 0 };
    data.values.forEach((row, r) => {
      row.forEach((value, c) => {
        if (hits.length >= limit || value === null) return;
        if (!String(value).toLowerCase().includes(needle)) return;
        hits.push({
          sheet: data.sheet,
          ref: `${columnLetter(origin.left + c)}${String(origin.top + r + 1)}`,
          value,
        });
      });
    });
    if (hits.length >= limit) break;
  }

  return hits;
}

/** Current values behind a set of refs — what the edit preview diffs against. */
export async function readCells(refs: { sheet?: string | null; ref: string }[]): Promise<CellValue[]> {
  const out: CellValue[] = [];
  for (const target of refs) {
    try {
      const data = await readRange(target.sheet ?? null, target.ref);
      out.push(data.values[0]?.[0] ?? null);
    } catch {
      out.push(null);
    }
  }
  return out;
}

/**
 * The single write path.
 *
 * Nothing else in the app touches the workbook, and the agent never calls this
 * directly — Panel does, once the person has approved the edit.
 */
export async function writeCells(edits: CellEdit[]): Promise<void> {
  if (edits.length === 0) return;

  if (host !== "excel") {
    for (const edit of edits) {
      const target = splitAddress(edit.ref);
      const { grid } = mockSheet(target.sheet ?? edit.sheet ?? null);
      const box = parseA1(target.a1);
      if (!box) continue;
      const row = (grid[box.top] ??= []);
      // Keep the mock honest about types: a numeric literal lands as a number.
      const numeric = Number(edit.value);
      row[box.left] =
        edit.value.trim() !== "" && !Number.isNaN(numeric) && !edit.value.startsWith("=")
          ? numeric
          : edit.value;
    }
    return;
  }

  await Excel.run(async (context) => {
    for (const edit of edits) {
      const target = splitAddress(edit.ref);
      const sheetName = target.sheet ?? edit.sheet;
      const worksheet = sheetName
        ? context.workbook.worksheets.getItem(sheetName)
        : context.workbook.worksheets.getActiveWorksheet();
      const range = worksheet.getRange(target.a1);
      if (edit.value.startsWith("=")) {
        range.formulas = [[edit.value]];
      } else {
        const numeric = Number(edit.value);
        range.values = [[edit.value.trim() !== "" && !Number.isNaN(numeric) ? numeric : edit.value]];
      }
    }
    await context.sync();
  });
}

/** The one-line description of the active sheet shown in the pane's sheet bar. */
export async function activeSheet(): Promise<SheetInfo | null> {
  const sheets = await listSheets();
  return sheets.find((sheet) => sheet.active) ?? sheets[0] ?? null;
}

/** Preview mode only — lets the mock's "active sheet" follow what the agent reads. */
export function setPreviewActiveSheet(name: string): void {
  if (host !== "excel" && name in mockWorkbook) mockActive = name;
}
