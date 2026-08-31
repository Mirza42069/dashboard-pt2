import ExcelJS from "exceljs";
import { XMLBuilder } from "fast-xml-parser";
import yauzl from "yauzl";
import { createHash } from "node:crypto";

import { MAX_WORKBOOK_ROWS } from "./workbook-limits";

export const CORETAX_RULESETS = {
  FAKTUR_KELUARAN: "DJP-FAKTUR-KELUARAN-1.6.1",
  BPPU: "DJP-BPPU-3",
} as const;

const BPPU_V3_REFERENCE_SHA256 = "cafb2957d6452ba30b74e2436d1a809b3ba662eb78aaf9a3d523f836a73faae0";
const FAKTUR_1_6_1_REFERENCE_SHA256 = "9c93ad13a5ce4c348956a6561e0008088b278d8359292529c59fd7b11a948698";

export type CoretaxDocumentType = keyof typeof CORETAX_RULESETS;
export type CoretaxRow = Record<string, unknown>;

export const CORETAX_EDITABLE_FIELDS: Record<CoretaxDocumentType, string[]> = {
  FAKTUR_KELUARAN: [
    "TaxInvoiceDate",
    "TaxInvoiceOpt",
    "TrxCode",
    "AddInfo",
    "CustomDoc",
    "CustomDocMonthYear",
    "RefDesc",
    "FacilityStamp",
    "SellerIDTKU",
    "BuyerTin",
    "BuyerDocument",
    "BuyerCountry",
    "BuyerDocumentNumber",
    "BuyerName",
    "BuyerAdress",
    "BuyerEmail",
    "BuyerIDTKU",
  ],
  BPPU: [
    "TaxPeriodMonth",
    "TaxPeriodYear",
    "CounterpartTin",
    "IDPlaceOfBusinessActivityOfIncomeRecipient",
    "TaxCertificate",
    "TaxObjectCode",
    "TaxBase",
    "Rate",
    "Document",
    "DocumentNumber",
    "DocumentDate",
    "IDPlaceOfBusinessActivity",
    "GovTreasurerOpt",
    "SP2DNumber",
    "WithholdingDate",
  ],
};

export const CORETAX_DETAIL_FIELDS = [
  "Opt",
  "Code",
  "Name",
  "Unit",
  "Price",
  "Qty",
  "TotalDiscount",
  "TaxBase",
  "OtherTaxBase",
  "VATRate",
  "VAT",
  "STLGRate",
  "STLG",
] as const;

export type CoretaxValidationIssue = {
  severity: "ERROR" | "WARNING" | "INFO";
  code: string;
  fieldKey?: string;
  message: string;
  invalidValue?: unknown;
};

export type ParsedCoretaxWorkbook = {
  tin: string;
  sheetNames: string[];
  configuredSheet: string;
  referenceRates?: Record<string, string>;
  rows: Array<{
    sourceLocator: string;
    sourceSheet: string;
    sourceRowNumber: number;
    rawData: CoretaxRow;
    normalizedData: CoretaxRow;
  }>;
};

const FACTUR_HEADERS: Record<string, string> = {
  "Tanggal Faktur": "TaxInvoiceDate",
  "Jenis Faktur": "TaxInvoiceOpt",
  "Kode Transaksi": "TrxCode",
  "Keterangan Tambahan": "AddInfo",
  "Dokumen Pendukung": "CustomDoc",
  "Period Dok Pendukung": "CustomDocMonthYear",
  Referensi: "RefDesc",
  "Cap Fasilitas": "FacilityStamp",
  "ID TKU Penjual": "SellerIDTKU",
  "NPWP/NIK Pembeli": "BuyerTin",
  "Jenis ID Pembeli": "BuyerDocument",
  "Negara Pembeli": "BuyerCountry",
  "Nomor Dokumen Pembeli": "BuyerDocumentNumber",
  "Nama Pembeli": "BuyerName",
  "Alamat Pembeli": "BuyerAdress",
  "Email Pembeli": "BuyerEmail",
  "ID TKU Pembeli": "BuyerIDTKU",
};

const FACTUR_DETAIL_HEADERS: Record<string, string> = {
  "Barang/Jasa": "Opt",
  "Kode Barang Jasa": "Code",
  "Nama Barang/Jasa": "Name",
  "Nama Satuan Ukur": "Unit",
  "Harga Satuan": "Price",
  "Jumlah Barang Jasa": "Qty",
  "Total Diskon": "TotalDiscount",
  DPP: "TaxBase",
  "DPP Nilai Lain": "OtherTaxBase",
  "Tarif PPN": "VATRate",
  PPN: "VAT",
  "Tarif PPnBM": "STLGRate",
  PPnBM: "STLG",
};

const BPPU_HEADERS: Record<string, string> = {
  "Masa Pajak": "TaxPeriodMonth",
  "Tahun Pajak": "TaxPeriodYear",
  NPWP: "CounterpartTin",
  "ID TKU Penerima Penghasilan": "IDPlaceOfBusinessActivityOfIncomeRecipient",
  Fasilitas: "TaxCertificate",
  "Kode Objek Pajak": "TaxObjectCode",
  DPP: "TaxBase",
  Tarif: "Rate",
  "Jenis Dok. Referensi": "Document",
  "Nomor Dok. Referensi": "DocumentNumber",
  "Tanggal Dok. Referensi": "DocumentDate",
  "ID TKU Pemotong": "IDPlaceOfBusinessActivity",
  "Opsi Pembayaran (IP)": "GovTreasurerOpt",
  "Nomor SP2D (IP)": "SP2DNumber",
  "Tanggal Pemotongan": "WithholdingDate",
};

function cellValue(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value) return cellValue(value.result as ExcelJS.CellValue);
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return String(value).trim();
}

function rowObject(
  worksheet: ExcelJS.Worksheet,
  headerRowNumber: number,
  rowNumber: number,
  aliases: Record<string, string>,
) {
  const header = worksheet.getRow(headerRowNumber);
  const row = worksheet.getRow(rowNumber);
  const raw: CoretaxRow = {};
  const normalized: CoretaxRow = {};
  header.eachCell({ includeEmpty: false }, (cell, column) => {
    const label = cellValue(cell.value);
    if (!label || label === "Baris") return;
    const value = cellValue(row.getCell(column).value);
    raw[label] = value;
    const field = aliases[label];
    if (field) normalized[field] = value;
  });
  return { raw, normalized };
}

function requireHeaders(worksheet: ExcelJS.Worksheet, rowNumber: number, aliases: Record<string, string>) {
  const present = new Set<string>();
  worksheet.getRow(rowNumber).eachCell({ includeEmpty: false }, (cell) => present.add(cellValue(cell.value)));
  const missing = Object.keys(aliases).filter((header) => !present.has(header));
  if (missing.length > 0) {
    throw new Error(`${worksheet.name} does not match the official template. Missing columns: ${missing.join(", ")}.`);
  }
}

function workbookReferenceHash(workbook: ExcelJS.Workbook, sheetNames: string[]) {
  const payload = sheetNames.map((name) => {
    const sheet = workbook.getWorksheet(name);
    if (!sheet) return [name, []];
    const rows = Array.from({ length: sheet.rowCount }, (_, rowIndex) =>
      Array.from({ length: sheet.columnCount }, (_, columnIndex) =>
        cellValue(sheet.getRow(rowIndex + 1).getCell(columnIndex + 1).value),
      ),
    );
    return [name, rows];
  });
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function isEndRow(worksheet: ExcelJS.Worksheet, rowNumber: number) {
  return cellValue(worksheet.getRow(rowNumber).getCell(1).value).toUpperCase() === "END";
}

function parseFaktur(workbook: ExcelJS.Workbook): ParsedCoretaxWorkbook {
  const invoices = workbook.getWorksheet("Faktur");
  if (!invoices) throw new Error('Faktur Keluaran requires the official "Faktur" worksheet.');
  const details = workbook.getWorksheet("DetailFaktur");
  if (!details) throw new Error('Faktur Keluaran requires a "DetailFaktur" worksheet.');
  if (!workbook.getWorksheet("REF-General") || !workbook.getWorksheet("Keterangan") || !workbook.getWorksheet("Rilis note")) {
    throw new Error("The workbook does not match the official Faktur Keluaran 1.6.1 converter.");
  }
  requireHeaders(invoices, 3, FACTUR_HEADERS);
  requireHeaders(details, 1, FACTUR_DETAIL_HEADERS);
  const referenceVerified =
    workbookReferenceHash(workbook, ["REF-General", "REF-KetTambahan", "REF-CapFasilitas", "REF-KodeNegara"]) ===
    FAKTUR_1_6_1_REFERENCE_SHA256;

  const tin = cellValue(invoices.getCell("C1").value);
  const detailByLine = new Map<string, CoretaxRow[]>();
  let detailCount = 0;
  for (let rowNumber = 2; rowNumber <= details.rowCount; rowNumber += 1) {
    if (isEndRow(details, rowNumber)) break;
    const line = cellValue(details.getRow(rowNumber).getCell(1).value);
    if (!line) continue;
    const parsed = rowObject(details, 1, rowNumber, FACTUR_DETAIL_HEADERS);
    const existing = detailByLine.get(line) ?? [];
    existing.push(parsed.normalized);
    detailByLine.set(line, existing);
    detailCount += 1;
    if (detailCount > MAX_WORKBOOK_ROWS) throw new Error(`Workbook exceeds the ${MAX_WORKBOOK_ROWS.toLocaleString()} detail-row limit.`);
  }

  const rows: ParsedCoretaxWorkbook["rows"] = [];
  const invoiceLines = new Set<string>();
  for (let rowNumber = 4; rowNumber <= invoices.rowCount; rowNumber += 1) {
    if (isEndRow(invoices, rowNumber)) break;
    const line = cellValue(invoices.getRow(rowNumber).getCell(1).value);
    if (!line) continue;
    if (invoiceLines.has(line)) throw new Error(`Faktur line identifier ${line} is duplicated.`);
    invoiceLines.add(line);
    const parsed = rowObject(invoices, 3, rowNumber, FACTUR_HEADERS);
    parsed.normalized.GoodsServices = detailByLine.get(line) ?? [];
    parsed.normalized._referenceVerified = referenceVerified;
    rows.push({
      sourceLocator: `${invoices.name}!${rowNumber}`,
      sourceSheet: invoices.name,
      sourceRowNumber: rowNumber,
      rawData: parsed.raw,
      normalizedData: parsed.normalized,
    });
    if (rows.length > MAX_WORKBOOK_ROWS) throw new Error(`Workbook exceeds the ${MAX_WORKBOOK_ROWS.toLocaleString()} invoice-row limit.`);
  }
  const orphan = [...detailByLine.keys()].find((line) => !invoiceLines.has(line));
  if (orphan) throw new Error(`DetailFaktur line ${orphan} does not match a Faktur row.`);

  return {
    tin,
    sheetNames: workbook.worksheets.map((sheet) => sheet.name),
    configuredSheet: invoices.name,
    rows,
  };
}

function parseBppu(workbook: ExcelJS.Workbook): ParsedCoretaxWorkbook {
  const data = workbook.getWorksheet("DATA");
  if (!data) throw new Error('BPPU requires the official "DATA" worksheet.');
  if (!workbook.getWorksheet("BPPU") || !workbook.getWorksheet("REF")) {
    throw new Error("The workbook does not match the official DJP BPPU v3 converter.");
  }
  requireHeaders(data, 3, BPPU_HEADERS);
  const tin = cellValue(data.getCell("C1").value);
  const rateByCode = new Map<string, string>();
  const referenceRows: Array<[string, string]> = [];
  const reference = workbook.getWorksheet("REF");
  if (reference) {
    for (let rowNumber = 2; rowNumber <= reference.rowCount; rowNumber += 1) {
      const code = cellValue(reference.getRow(rowNumber).getCell(1).value);
      const rate = cellValue(reference.getRow(rowNumber).getCell(3).value);
      if (code && rate) {
        rateByCode.set(code, rate);
        referenceRows.push([code, rate]);
      }
    }
  }
  const referenceVerified =
    createHash("sha256").update(JSON.stringify(referenceRows)).digest("hex") === BPPU_V3_REFERENCE_SHA256;

  const rows: ParsedCoretaxWorkbook["rows"] = [];
  for (let rowNumber = 4; rowNumber <= data.rowCount; rowNumber += 1) {
    if (isEndRow(data, rowNumber)) break;
    const parsed = rowObject(data, 3, rowNumber, BPPU_HEADERS);
    if (!Object.values(parsed.normalized).some(Boolean)) continue;
    const code = String(parsed.normalized.TaxObjectCode ?? "");
    parsed.normalized._expectedRate = rateByCode.get(code) ?? "";
    parsed.normalized._referenceVerified = referenceVerified;
    rows.push({
      sourceLocator: `${data.name}!${rowNumber}`,
      sourceSheet: data.name,
      sourceRowNumber: rowNumber,
      rawData: parsed.raw,
      normalizedData: parsed.normalized,
    });
    if (rows.length > MAX_WORKBOOK_ROWS) throw new Error(`Workbook exceeds the ${MAX_WORKBOOK_ROWS.toLocaleString()} row limit.`);
  }

  return {
    tin,
    sheetNames: workbook.worksheets.map((sheet) => sheet.name),
    configuredSheet: data.name,
    referenceRates: Object.fromEntries(rateByCode),
    rows,
  };
}

export async function parseCoretaxWorkbook(
  bytes: ArrayBuffer | Uint8Array,
  documentType: CoretaxDocumentType,
) {
  await assertSafeWorkbookArchive(bytes);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as ArrayBuffer);
  return documentType === "FAKTUR_KELUARAN" ? parseFaktur(workbook) : parseBppu(workbook);
}

async function assertSafeWorkbookArchive(bytes: ArrayBuffer | Uint8Array) {
  const buffer = Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error("Workbook archive could not be opened."));
        return;
      }
      let entries = 0;
      let declaredUncompressedBytes = 0;
      let actualUncompressedBytes = 0;
      let settled = false;
      const fail = (message: string) => {
        if (settled) return;
        settled = true;
        zipFile.close();
        reject(new Error(message));
      };
      zipFile.on("error", (error) => fail(error.message));
      zipFile.on("entry", (entry) => {
        entries += 1;
        declaredUncompressedBytes += entry.uncompressedSize;
        if ((entry.generalPurposeBitFlag & 0x1) !== 0) return fail("Encrypted workbooks are not supported.");
        if (entries > 5_000) return fail("Workbook archive contains too many entries.");
        if (declaredUncompressedBytes > 250 * 1024 * 1024) return fail("Workbook expands beyond the 250 MB processing limit.");
        if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > 200) {
          return fail("Workbook contains a suspiciously compressed entry.");
        }
        if (/\/$/.test(entry.fileName)) {
          zipFile.readEntry();
          return;
        }
        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail(streamError?.message ?? "Workbook entry could not be read.");
          stream.on("data", (chunk: Buffer) => {
            actualUncompressedBytes += chunk.length;
            if (actualUncompressedBytes > 250 * 1024 * 1024) {
              stream.destroy();
              fail("Workbook expands beyond the 250 MB processing limit.");
            }
          });
          stream.on("error", (error) => fail(error.message));
          stream.on("end", () => {
            if (!settled) zipFile.readEntry();
          });
        });
      });
      zipFile.on("end", () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      });
      zipFile.readEntry();
    });
  });
}

const REQUIRED_FIELDS: Record<CoretaxDocumentType, string[]> = {
  FAKTUR_KELUARAN: [
    "TaxInvoiceDate",
    "TaxInvoiceOpt",
    "TrxCode",
    "SellerIDTKU",
    "BuyerTin",
    "BuyerDocument",
    "BuyerCountry",
    "BuyerDocumentNumber",
    "BuyerName",
    "BuyerAdress",
    "BuyerIDTKU",
  ],
  BPPU: [
    "TaxPeriodMonth",
    "TaxPeriodYear",
    "CounterpartTin",
    "IDPlaceOfBusinessActivityOfIncomeRecipient",
    "TaxCertificate",
    "TaxObjectCode",
    "TaxBase",
    "Rate",
    "Document",
    "DocumentNumber",
    "DocumentDate",
    "IDPlaceOfBusinessActivity",
    "WithholdingDate",
  ],
};

const isDate = (value: unknown) => {
  const text = String(value ?? "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};
const isDecimal = (value: unknown) => /^\d+(?:\.\d+)?$/.test(String(value ?? ""));
const digits = (value: unknown, length: number) => new RegExp(`^\\d{${length}}$`).test(String(value ?? ""));

export function validateCoretaxRow(
  documentType: CoretaxDocumentType,
  row: CoretaxRow,
  options: { bppuReferenceRates?: Record<string, string> } = {},
): CoretaxValidationIssue[] {
  const issues: CoretaxValidationIssue[] = [];
  for (const field of REQUIRED_FIELDS[documentType]) {
    if (String(row[field] ?? "").trim() === "") {
      issues.push({ severity: "ERROR", code: "REQUIRED", fieldKey: field, message: `${field} is required.` });
    }
  }

  const dateFields =
    documentType === "FAKTUR_KELUARAN"
      ? ["TaxInvoiceDate"]
      : ["DocumentDate", "WithholdingDate"];
  for (const field of dateFields) {
    if (row[field] && !isDate(row[field])) {
      issues.push({ severity: "ERROR", code: "INVALID_DATE", fieldKey: field, message: `${field} must use YYYY-MM-DD.`, invalidValue: row[field] });
    }
  }

  const tinFields = documentType === "FAKTUR_KELUARAN" ? ["BuyerTin"] : ["CounterpartTin"];
  for (const field of tinFields) {
    if (row[field] && !digits(row[field], 16)) {
      issues.push({ severity: "ERROR", code: "INVALID_TIN", fieldKey: field, message: `${field} must contain 16 digits.`, invalidValue: row[field] });
    }
  }

  const nitkuFields =
    documentType === "FAKTUR_KELUARAN"
      ? ["SellerIDTKU", "BuyerIDTKU"]
      : ["IDPlaceOfBusinessActivityOfIncomeRecipient", "IDPlaceOfBusinessActivity"];
  for (const field of nitkuFields) {
    if (row[field] && !digits(row[field], 22)) {
      issues.push({ severity: "ERROR", code: "INVALID_NITKU", fieldKey: field, message: `${field} must contain 22 digits.`, invalidValue: row[field] });
    }
  }

  if (documentType === "FAKTUR_KELUARAN") {
    if (row._referenceVerified !== true) {
      issues.push({ severity: "ERROR", code: "UNVERIFIED_REFERENCE", fieldKey: "TrxCode", message: "The Faktur reference sheets do not match the pinned DJP 1.6.1 ruleset." });
    }
    if (row.TaxInvoiceOpt !== "Normal") {
      issues.push({ severity: "ERROR", code: "INVALID_INVOICE_OPTION", fieldKey: "TaxInvoiceOpt", message: "Faktur Keluaran 1.6.1 requires TaxInvoiceOpt to be Normal.", invalidValue: row.TaxInvoiceOpt });
    }
    if (!/^(0[1-9]|10)$/.test(String(row.TrxCode ?? ""))) {
      issues.push({ severity: "ERROR", code: "INVALID_TRANSACTION_CODE", fieldKey: "TrxCode", message: "Transaction code must be 01 through 10.", invalidValue: row.TrxCode });
    }
    if (["07", "08"].includes(String(row.TrxCode)) && (!row.AddInfo || !row.FacilityStamp)) {
      issues.push({ severity: "ERROR", code: "FACILITY_REQUIRED", fieldKey: "AddInfo", message: "Transactions 07 and 08 require additional information and a facility stamp." });
    }
    const goods = Array.isArray(row.GoodsServices) ? (row.GoodsServices as CoretaxRow[]) : [];
    if (goods.length === 0) {
      issues.push({ severity: "ERROR", code: "GOODS_REQUIRED", fieldKey: "GoodsServices", message: "At least one goods or services line is required." });
    }
    goods.forEach((item, index) => {
      for (const field of ["Opt", "Name", "Unit", "Price", "Qty", "TotalDiscount", "TaxBase", "OtherTaxBase", "VATRate", "VAT", "STLGRate", "STLG"]) {
        if (String(item[field] ?? "").trim() === "") {
          issues.push({ severity: "ERROR", code: "GOODS_FIELD_REQUIRED", fieldKey: `GoodsServices.${index}.${field}`, message: `${field} is required for goods line ${index + 1}.` });
        }
      }
      for (const field of ["Price", "Qty", "TotalDiscount", "TaxBase", "OtherTaxBase", "VATRate", "VAT", "STLGRate", "STLG"]) {
        if (item[field] && !isDecimal(item[field])) {
          issues.push({ severity: "ERROR", code: "INVALID_DECIMAL", fieldKey: `GoodsServices.${index}.${field}`, message: `${field} must be a non-negative decimal.`, invalidValue: item[field] });
        }
        if (item[field] && !/^\d+(?:\.\d{1,2})?$/.test(String(item[field]))) {
          issues.push({ severity: "ERROR", code: "DECIMAL_SCALE", fieldKey: `GoodsServices.${index}.${field}`, message: `${field} may contain at most two decimal places.`, invalidValue: item[field] });
        }
      }
    });
  } else {
    if (row._referenceVerified !== true) {
      issues.push({ severity: "ERROR", code: "UNVERIFIED_REFERENCE", fieldKey: "TaxObjectCode", message: "The BPPU reference sheet does not match the pinned DJP v3 ruleset." });
    }
    const month = Number(row.TaxPeriodMonth);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      issues.push({ severity: "ERROR", code: "INVALID_TAX_MONTH", fieldKey: "TaxPeriodMonth", message: "Tax period month must be from 1 to 12.", invalidValue: row.TaxPeriodMonth });
    }
    if (!/^\d{4}$/.test(String(row.TaxPeriodYear ?? ""))) {
      issues.push({ severity: "ERROR", code: "INVALID_TAX_YEAR", fieldKey: "TaxPeriodYear", message: "Tax period year must contain four digits.", invalidValue: row.TaxPeriodYear });
    }
    for (const field of ["TaxBase", "Rate"]) {
      if (row[field] && !isDecimal(row[field])) {
        issues.push({ severity: "ERROR", code: "INVALID_DECIMAL", fieldKey: field, message: `${field} must be a non-negative decimal.`, invalidValue: row[field] });
      }
    }
    const code = String(row.TaxObjectCode ?? "");
    const expectedRate = String(options.bppuReferenceRates?.[code] ?? row._expectedRate ?? "");
    if (!expectedRate) {
      issues.push({ severity: "ERROR", code: "UNKNOWN_TAX_OBJECT", fieldKey: "TaxObjectCode", message: `Tax object ${code || "(blank)"} is not present in the pinned BPPU v3 reference table.`, invalidValue: row.TaxObjectCode });
    }
    if (expectedRate && row.TaxCertificate !== "ETC" && String(row.Rate) !== expectedRate) {
      issues.push({ severity: "ERROR", code: "RATE_MISMATCH", fieldKey: "Rate", message: `Rate must be ${expectedRate} for tax object ${row.TaxObjectCode}.`, invalidValue: row.Rate });
    }
    if (row.GovTreasurerOpt === "Direct" && !row.SP2DNumber) {
      issues.push({ severity: "ERROR", code: "SP2D_REQUIRED", fieldKey: "SP2DNumber", message: "SP2D number is required for direct government payments." });
    }
  }

  return issues;
}

function withoutPrivateFields(row: CoretaxRow) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith("_")));
}

function orderedFields(row: CoretaxRow, fields: readonly string[]) {
  return Object.fromEntries(fields.map((field) => [field, row[field] ?? ""]));
}

const FACTUR_XML_FIELDS = [
  "TaxInvoiceDate",
  "TaxInvoiceOpt",
  "TrxCode",
  "AddInfo",
  "CustomDoc",
  "CustomDocMonthYear",
  "RefDesc",
  "FacilityStamp",
  "SellerIDTKU",
  "BuyerTin",
  "BuyerDocument",
  "BuyerCountry",
  "BuyerDocumentNumber",
  "BuyerName",
  "BuyerAdress",
  "BuyerEmail",
  "BuyerIDTKU",
] as const;

const BPPU_XML_FIELDS = [
  "TaxPeriodMonth",
  "TaxPeriodYear",
  "CounterpartTin",
  "IDPlaceOfBusinessActivityOfIncomeRecipient",
  "TaxCertificate",
  "TaxObjectCode",
  "TaxBase",
  "Rate",
  "Document",
  "DocumentNumber",
  "DocumentDate",
  "IDPlaceOfBusinessActivity",
  "GovTreasurerOpt",
  "SP2DNumber",
  "WithholdingDate",
] as const;

export function generateCoretaxXml(
  documentType: CoretaxDocumentType,
  tin: string,
  rows: CoretaxRow[],
) {
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    suppressEmptyNode: false,
    suppressBooleanAttributes: false,
    processEntities: true,
  });
  const body =
    documentType === "FAKTUR_KELUARAN"
      ? {
          TaxInvoiceBulk: {
            "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            "@_xsi:noNamespaceSchemaLocation": "TaxInvoice.xsd",
            TIN: tin,
            ListOfTaxInvoice: {
              TaxInvoice: rows.map((row) => {
                const clean = withoutPrivateFields(row);
                const goods = Array.isArray(clean.GoodsServices) ? (clean.GoodsServices as CoretaxRow[]) : [];
                return {
                  ...orderedFields(clean, FACTUR_XML_FIELDS),
                  ListOfGoodService: { GoodService: goods.map((item) => orderedFields(item, CORETAX_DETAIL_FIELDS)) },
                };
              }),
            },
          },
        }
      : {
          BpuBulk: {
            "@_xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
            TIN: tin,
            ListOfBpu: {
              Bpu: rows.map((row) => {
                const output = orderedFields(withoutPrivateFields(row), BPPU_XML_FIELDS);
                if (!output.SP2DNumber) output.SP2DNumber = { "@_xsi:nil": "true" };
                return output;
              }),
            },
          },
        };
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${builder.build(body)}`;
}

export function explainCoretaxIssue(issue: Pick<CoretaxValidationIssue, "code" | "fieldKey" | "message">) {
  const suggestions: Record<string, string> = {
    REQUIRED: "Enter the value shown in the source document before validating again.",
    INVALID_DATE: "Use an ISO date such as 2026-08-31.",
    INVALID_TIN: "Enter the 16-digit NPWP or NIK without spaces or punctuation.",
    INVALID_NITKU: "Enter the 22-digit NITKU without spaces or punctuation.",
    RATE_MISMATCH: "Use the rate published for the selected tax object code, unless the ETC facility applies.",
    FACILITY_REQUIRED: "Choose the DJP additional-information and facility-stamp codes for transaction 07 or 08.",
    GOODS_REQUIRED: "Add at least one item in the DetailFaktur worksheet and upload the workbook again.",
    SP2D_REQUIRED: "Provide the SP2D number for a Direct government payment.",
    UNVERIFIED_REFERENCE: "Start from the official DJP BPPU v3 converter without changing its REF worksheet.",
    UNKNOWN_TAX_OBJECT: "Choose a tax-object code published in the official BPPU v3 REF worksheet.",
    INVALID_INVOICE_OPTION: "Use Normal, as required by the official Faktur Keluaran 1.6.1 template.",
    INVALID_TRANSACTION_CODE: "Choose an official Faktur transaction code from 01 through 10.",
  };
  return {
    title: issue.fieldKey ? `Check ${issue.fieldKey}` : "Check this row",
    explanation: issue.message,
    suggestion: suggestions[issue.code] ?? "Review the source document and replace the value with the DJP-compliant format.",
  };
}
