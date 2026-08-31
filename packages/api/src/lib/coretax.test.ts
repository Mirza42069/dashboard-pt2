import { describe, expect, test } from "bun:test";
import { XMLParser } from "fast-xml-parser";
import ExcelJS from "exceljs";

import { generateCoretaxXml, parseCoretaxWorkbook, validateCoretaxRow } from "./coretax";

const BPPU_HEADERS = [
  "",
  "Masa Pajak",
  "Tahun Pajak",
  "NPWP",
  "ID TKU Penerima Penghasilan",
  "Fasilitas",
  "Kode Objek Pajak",
  "DPP",
  "Tarif",
  "Jenis Dok. Referensi",
  "Nomor Dok. Referensi",
  "Tanggal Dok. Referensi",
  "ID TKU Pemotong",
  "Opsi Pembayaran (IP)",
  "Nomor SP2D (IP)",
  "Tanggal Pemotongan",
];

describe("Coretax validation", () => {
  test("requires a matching BPPU rate and 22 digit NITKU", () => {
    const issues = validateCoretaxRow("BPPU", {
      TaxPeriodMonth: "1",
      TaxPeriodYear: "2026",
      CounterpartTin: "1234567890123456",
      IDPlaceOfBusinessActivityOfIncomeRecipient: "123",
      TaxCertificate: "N/A",
      TaxObjectCode: "24-104-05",
      TaxBase: "100000",
      Rate: "3",
      _expectedRate: "2",
      Document: "CommercialInvoice",
      DocumentNumber: "INV-1",
      DocumentDate: "2026-08-01",
      IDPlaceOfBusinessActivity: "1234567890123456000000",
      GovTreasurerOpt: "N/A",
      WithholdingDate: "2026-08-15",
    });

    expect(issues.map((issue) => issue.code)).toContain("INVALID_NITKU");
    expect(issues.map((issue) => issue.code)).toContain("RATE_MISMATCH");
  });

  test("rejects impossible calendar dates", () => {
    const issues = validateCoretaxRow("BPPU", {
      TaxPeriodMonth: "2",
      TaxPeriodYear: "2026",
      CounterpartTin: "1234567890123456",
      IDPlaceOfBusinessActivityOfIncomeRecipient: "1234567890123456000000",
      TaxCertificate: "N/A",
      TaxObjectCode: "24-101-01",
      TaxBase: "100",
      Rate: "15",
      Document: "CommercialInvoice",
      DocumentNumber: "INV-1",
      DocumentDate: "2026-02-31",
      IDPlaceOfBusinessActivity: "1234567890123456000000",
      WithholdingDate: "2026-02-31",
    });
    expect(issues.filter((issue) => issue.code === "INVALID_DATE")).toHaveLength(2);
  });
});

describe("Coretax workbook parsing", () => {
  test("preserves BPPU tax identifiers and reads the DJP reference rate", async () => {
    const workbook = new ExcelJS.Workbook();
    const data = workbook.addWorksheet("DATA");
    workbook.addWorksheet("BPPU");
    data.getCell("C1").value = "0029482015507000";
    data.getRow(3).values = BPPU_HEADERS;
    data.getRow(4).values = [
      "",
      1,
      2026,
      "0671112505640003",
      "0671112505640003000000",
      "N/A",
      "24-101-01",
      100000,
      15,
      "CommercialInvoice",
      "ABC123",
      new Date("2026-01-13T00:00:00.000Z"),
      "0029482015507000000000",
      "N/A",
      "",
      new Date("2026-01-21T00:00:00.000Z"),
    ];
    const reference = workbook.addWorksheet("REF");
    reference.getRow(2).values = ["24-101-01", "Dividen", 15];

    const parsed = await parseCoretaxWorkbook(await workbook.xlsx.writeBuffer(), "BPPU");

    expect(parsed.tin).toBe("0029482015507000");
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.normalizedData.CounterpartTin).toBe("0671112505640003");
    expect(parsed.rows[0]?.normalizedData._expectedRate).toBe("15");
  });

  test("does not treat values containing END as the converter sentinel", async () => {
    const workbook = new ExcelJS.Workbook();
    const data = workbook.addWorksheet("DATA");
    workbook.addWorksheet("BPPU");
    data.getCell("C1").value = "0029482015507000";
    data.getRow(3).values = BPPU_HEADERS;
    data.getRow(4).values = ["", 1, 2026, "1234567890123456", "1234567890123456000000", "N/A", "24-101-01", 100, 15, "CommercialInvoice", "VENDOR-1", new Date("2026-01-01"), "1234567890123456000000", "N/A", "", new Date("2026-01-02")];
    workbook.addWorksheet("REF");

    const parsed = await parseCoretaxWorkbook(await workbook.xlsx.writeBuffer(), "BPPU");

    expect(parsed.rows).toHaveLength(1);
  });
});

describe("Coretax XML", () => {
  test("generates the official BpuBulk hierarchy", () => {
    const xml = generateCoretaxXml("BPPU", "0029482015507000", [
      {
        TaxPeriodMonth: "1",
        TaxPeriodYear: "2026",
        CounterpartTin: "1671112505640003",
        IDPlaceOfBusinessActivityOfIncomeRecipient: "1671112505640003000000",
        TaxCertificate: "N/A",
        TaxObjectCode: "24-101-01",
        TaxBase: "100000000",
        Rate: "15",
        Document: "CommercialInvoice",
        DocumentNumber: "ABC&123",
        DocumentDate: "2026-01-13",
        IDPlaceOfBusinessActivity: "0029482015507000000000",
        GovTreasurerOpt: "N/A",
        SP2DNumber: "",
        WithholdingDate: "2026-01-21",
      },
    ]);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    expect(parsed.BpuBulk.TIN).toBe(29482015507000);
    expect(parsed.BpuBulk.ListOfBpu.Bpu.DocumentNumber).toBe("ABC&123");
    expect(xml).toContain("xsi:nil=\"true\"");
  });

  test("emits only pinned Faktur fields in DJP order", () => {
    const xml = generateCoretaxXml("FAKTUR_KELUARAN", "1091031210912281", [
      {
        BuyerTin: "1091031210912281",
        TaxInvoiceDate: "2026-08-31",
        TaxInvoiceOpt: "Normal",
        TrxCode: "01",
        SellerIDTKU: "1091031210912281000000",
        BuyerDocument: "TIN",
        BuyerCountry: "IDN",
        BuyerName: "Buyer",
        BuyerAdress: "Jakarta",
        BuyerEmail: "buyer@example.com",
        BuyerIDTKU: "1091031210912281000000",
        UnexpectedColumn: "must-not-leak",
        GoodsServices: [
          {
            Opt: "A",
            Code: "000000",
            Name: "Barang",
            Unit: "UM.0001",
            Price: "100",
            Qty: "1",
            TotalDiscount: "0",
            TaxBase: "100",
            OtherTaxBase: "100",
            VATRate: "12",
            VAT: "12",
            STLGRate: "0",
            STLG: "0",
          },
        ],
      },
    ]);

    expect(xml).not.toContain("UnexpectedColumn");
    expect(xml.indexOf("<TaxInvoiceDate>")).toBeLessThan(xml.indexOf("<BuyerTin>"));
    expect(xml).toContain("<ListOfGoodService>");
  });
});
