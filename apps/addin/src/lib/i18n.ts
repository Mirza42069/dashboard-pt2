export type Locale = "en" | "id";

const locale: Locale =
  typeof navigator !== "undefined" &&
  typeof navigator.language === "string" &&
  navigator.language.startsWith("id")
    ? "id"
    : "en";

export function getLocale(): Locale {
  return locale;
}

const en = {
  brand: "Tickmark",
  previewBadge: "Preview",
  excelBadge: "Excel",
  loading: "Connecting…",
  "sheet.rows": "{rows} rows × {cols} cols",
  "sheet.refresh": "Refresh",
  "sheet.refreshing": "Reading…",
  "action.validate": "Validate sheet",
  "action.validateRunning": "Validating…",
  "thread.emptyTitle": "Ask about this sheet",
  "thread.empty": "Ask about Coretax, or run a validation on this sheet.",
  "thread.suggestion.validate": "Validate this sheet",
  "thread.suggestion.summarize": "Summarize this sheet",
  "thread.suggestion.coretax": "What is missing for Coretax?",
  "thread.log": "Conversation",
  "thread.jumpToLatest": "Jump to latest",
  "thread.working": "Working...",
  "composer.placeholder": "Ask about tax, Coretax, or this sheet…",
  "composer.send": "Send",
  "composer.hint": "to send",
  "issues.title": "{count} issue(s) found",
  "issues.none": "No issues found.",
  "issues.apply": "Apply",
  "issues.applied": "Applied",
  "issues.fixUnavailable": "No automatic fix",
  "issues.severity.error": "Error",
  "issues.severity.warning": "Warning",
  "source.llm": "AI",
  "source.script": "Checks",
  "error.generic": "Something went wrong. Try again.",
  "issue.missing_invoice": "Invoice number is empty.",
  "issue.missing_npwp": "NPWP is empty.",
  "issue.missing_dpp": "DPP is empty.",
  "issue.bad_npwp": "NPWP must be 15 or 16 digits.",
  "issue.non_positive_dpp": "DPP must be greater than zero.",
  "issue.vat_mismatch": "PPN should be 11% of DPP.",
  "issue.bad_date": "Date is not a valid date.",
  "issue.duplicate_invoice": "Duplicate invoice number.",
  "step.read_sheet": "Read sheet ({rows}×{columns})",
  "step.map_columns": "Mapped {mapped} Coretax columns",
  "step.check_rows": "Checked rows — {issues} finding(s)",
  "step.consult_model": "Consulted AI model",
  "step.script_only": "Ran built-in checks",
};

const id = {
  brand: "Tickmark",
  previewBadge: "Pratinjau",
  excelBadge: "Excel",
  loading: "Menghubungkan…",
  "sheet.rows": "{rows} baris × {cols} kolom",
  "sheet.refresh": "Muat ulang",
  "sheet.refreshing": "Membaca…",
  "action.validate": "Validasi sheet",
  "action.validateRunning": "Memvalidasi…",
  "thread.emptyTitle": "Tanya tentang sheet ini",
  "thread.empty": "Tanya soal Coretax, atau jalankan validasi pada sheet ini.",
  "thread.suggestion.validate": "Validasi sheet ini",
  "thread.suggestion.summarize": "Ringkas sheet ini",
  "thread.suggestion.coretax": "Apa yang kurang untuk Coretax?",
  "thread.log": "Percakapan",
  "thread.jumpToLatest": "Ke pesan terbaru",
  "thread.working": "Memproses...",
  "composer.placeholder": "Tanya pajak, Coretax, atau sheet ini…",
  "composer.send": "Kirim",
  "composer.hint": "untuk kirim",
  "issues.title": "{count} temuan",
  "issues.none": "Tidak ada temuan.",
  "issues.apply": "Terapkan",
  "issues.applied": "Diterapkan",
  "issues.fixUnavailable": "Perbaiki manual",
  "issues.severity.error": "Kesalahan",
  "issues.severity.warning": "Peringatan",
  "source.llm": "AI",
  "source.script": "Pemeriksaan",
  "error.generic": "Terjadi kesalahan. Coba lagi.",
  "issue.missing_invoice": "Nomor faktur kosong.",
  "issue.missing_npwp": "NPWP kosong.",
  "issue.missing_dpp": "DPP kosong.",
  "issue.bad_npwp": "NPWP harus 15 atau 16 digit.",
  "issue.non_positive_dpp": "DPP harus lebih dari nol.",
  "issue.vat_mismatch": "PPN seharusnya 11% dari DPP.",
  "issue.bad_date": "Tanggal tidak valid.",
  "issue.duplicate_invoice": "Nomor faktur duplikat.",
  "step.read_sheet": "Baca sheet ({rows}×{columns})",
  "step.map_columns": "Petakan {mapped} kolom Coretax",
  "step.check_rows": "Periksa baris — {issues} temuan",
  "step.consult_model": "Konsultasi model AI",
  "step.script_only": "Jalankan pemeriksaan bawaan",
} satisfies typeof en;

const dictionaries: Record<Locale, typeof en> = { en, id };

export function t(key: keyof typeof en | (string & {}), params?: Record<string, string | number>): string {
  const dictionary = dictionaries[locale] as Record<string, string>;
  const text: string = dictionary[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
