import { t } from "./i18n";

/**
 * The Office.js boundary.
 *
 * Everything the rest of the app knows about Excel is three functions here:
 * detect the host, read the active sheet, write cells back. When Office.js is
 * absent — the pane opened in a plain browser — the module serves a sample
 * Faktur Keluaran sheet with a handful of deliberate defects, so the whole
 * prototype is demonstrable before anything is sideloaded.
 */

export type SheetSnapshot = {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
};

export type CellFix = { ref: string; value: string };

let host: "excel" | "browser" = "browser";

export function isInExcel(): boolean {
  return host === "excel";
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
/* Mock sheet — the browser-preview workbook.                          */
/* ------------------------------------------------------------------ */

const mockHeaders = ["No", "Nomor Faktur", "Lawan Transaksi", "NPWP", "Tanggal Faktur", "DPP", "PPN"];

const mockRows: (string | number | boolean | null)[][] = [
  ["1", "010.00-24.12345678", "PT Maju Jaya", "0123456789012345", "2026-01-05", 15_000_000, 1_650_000],
  // NPWP with 5 digits — bad_npwp.
  ["2", "010.00-24.12345679", "CV Sumber Rezeki", "12345", "2026-01-07", 8_250_000, 907_500],
  // 31 February — bad_date; PPN 2,000,000 on a 20,000,000 DPP — vat_mismatch.
  ["3", "010.00-24.12345680", "PT Berkah Abadi", "0987654321098765", "31/02/2026", 20_000_000, 2_000_000],
  // Invoice number already used on row 2 — duplicate_invoice.
  ["4", "010.00-24.12345679", "PT Maju Jaya", "0123456789012345", "2026-01-11", 5_000_000, 550_000],
  // No DPP — missing_dpp.
  ["5", "010.00-24.12345681", "UD Sentosa", "0123456789012346", "2026-01-12", null, 0],
  ["6", "010.00-24.12345682", "PT Karya Bersama", "0223456789012347", "2026-01-15", 12_000_000, 1_320_000],
  ["7", "010.00-24.12345683", "PT Lestari", "0323456789012348", "2026-01-18", 7_300_000, 803_000],
  ["8", "010.00-24.12345684", "CV Mitra", "0423456789012349", "2026-01-20", 15_750_000, 1_732_500],
];

function mockSnapshot(): SheetSnapshot {
  return { name: "Faktur Keluaran (sample)", headers: [...mockHeaders], rows: mockRows.map((row) => [...row]) };
}

function refToCell(ref: string): { row: number; column: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/u);
  if (!match) return null;
  const [, letters, digits] = match;
  let column = 0;
  for (const letter of letters ?? "") column = column * 26 + (letter.charCodeAt(0) - 64);
  return { row: Number(digits) - 2, column: column - 1 }; // header is row 1, columns 0-based
}

/* ------------------------------------------------------------------ */
/* Real Office.js implementations.                                     */
/* ------------------------------------------------------------------ */

/** The pane sends at most this many rows per turn — the server caps there too. */
const MAX_ROWS = 300;

async function excelSnapshot(): Promise<SheetSnapshot> {
  return Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getActiveWorksheet();
    const usedRange = worksheet.getUsedRange();
    usedRange.load("rowCount, columnCount, values");
    worksheet.load("name");
    await context.sync();

    const values = (usedRange.values ?? []) as (string | number | boolean | null)[][];
    const [headerRow = [], ...dataRows] = values;
    return {
      name: worksheet.name,
      headers: (headerRow ?? []).map((cell) => (cell === null ? "" : String(cell))),
      rows: dataRows.slice(0, MAX_ROWS).map((row) => row.slice(0, 64)),
    };
  });
}

async function excelApplyFixes(fixes: CellFix[]): Promise<void> {
  await Excel.run(async (context) => {
    const worksheet = context.workbook.worksheets.getActiveWorksheet();
    for (const fix of fixes) {
      worksheet.getRange(fix.ref).values = [[fix.value]];
    }
    await context.sync();
  });
}

/* ------------------------------------------------------------------ */
/* Public surface.                                                     */
/* ------------------------------------------------------------------ */

export function readSheet(): Promise<SheetSnapshot> {
  return host === "excel" ? excelSnapshot() : Promise.resolve(mockSnapshot());
}

export function applyFixes(fixes: CellFix[]): Promise<void> {
  if (host === "excel") return excelApplyFixes(fixes);

  for (const fix of fixes) {
    const cell = refToCell(fix.ref);
    if (!cell) continue;
    const row = mockRows[cell.row];
    if (row) row[cell.column] = fix.value;
  }
  return Promise.resolve();
}

export function sheetBadge(): string {
  return host === "excel" ? t("excelBadge") : t("previewBadge");
}
