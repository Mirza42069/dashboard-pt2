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

/**
 * Chrome strings only.
 *
 * The agent's own words are not in here and cannot be — it answers in whatever
 * language it was written to, about a workbook nothing in this file knows
 * anything about. This dictionary covers the pane around it: the header, the
 * sheet bar, the labels on tool rows, the edit-approval buttons.
 */
const en = {
  brand: "Tickmark",
  previewBadge: "Preview",
  excelBadge: "Excel",
  loading: "Connecting…",
  "sheet.rows": "{rows} rows × {cols} cols",
  "sheet.empty": "Empty sheet",
  "sheet.refresh": "Refresh",
  "sheet.refreshing": "Reading…",
  "thread.emptyTitle": "Ask about this workbook",
  "thread.empty": "The agent reads the sheet itself before it answers.",
  "thread.suggestion.overview": "What is in this workbook?",
  "thread.suggestion.checks": "Find anything inconsistent",
  "thread.suggestion.selection": "Explain my selection",
  "thread.log": "Conversation",
  "thread.jumpToLatest": "Jump to latest",
  "thread.working": "Working…",
  "thread.thinking": "Thinking",
  "thread.stopped": "Stopped.",
  "thread.copy": "Copy",
  "thread.copied": "Copied",
  "composer.placeholder": "Ask about this workbook…",
  "composer.send": "Send",
  "composer.stop": "Stop",
  "composer.hint": "to send",
  "edits.title": "{count} cell edit(s) proposed",
  "edits.apply": "Apply",
  "edits.discard": "Discard",
  "edits.applied": "Applied",
  "edits.discarded": "Discarded",
  "edits.blank": "(blank)",
  "error.generic": "Something went wrong. Try again.",
  "error.model": "The model call failed: {detail}",
  "error.noModel":
    "No model key configured. Set VITE_AI_GATEWAY_KEY in apps/addin/.env, then restart the dev server.",
  "tool.request": "Request",
  "tool.response": "Response",
  "tool.activeSheet": "active sheet",
  "tool.list_sheets": "Listing sheets",
  "tool.list_sheets.done": "{count} sheet(s)",
  "tool.read_used_range": "Reading {sheet}",
  "tool.read_range": "Reading {range}",
  "tool.read.done": "{target} — {dims}",
  "tool.get_selection": "Reading the selection",
  "tool.find_cells": "Searching for “{query}”",
  "tool.find_cells.done": "{count} match(es)",
  "tool.write_cells": "Proposing {count} edit(s)",
  "tool.write_formula": "Proposing a formula for {ref}",
};

const id = {
  brand: "Tickmark",
  previewBadge: "Pratinjau",
  excelBadge: "Excel",
  loading: "Menghubungkan…",
  "sheet.rows": "{rows} baris × {cols} kolom",
  "sheet.empty": "Sheet kosong",
  "sheet.refresh": "Muat ulang",
  "sheet.refreshing": "Membaca…",
  "thread.emptyTitle": "Tanya tentang workbook ini",
  "thread.empty": "Agen membaca sheet sendiri sebelum menjawab.",
  "thread.suggestion.overview": "Apa isi workbook ini?",
  "thread.suggestion.checks": "Cari yang tidak konsisten",
  "thread.suggestion.selection": "Jelaskan seleksi saya",
  "thread.log": "Percakapan",
  "thread.jumpToLatest": "Ke pesan terbaru",
  "thread.working": "Memproses…",
  "thread.thinking": "Berpikir",
  "thread.stopped": "Dihentikan.",
  "thread.copy": "Salin",
  "thread.copied": "Tersalin",
  "composer.placeholder": "Tanya tentang workbook ini…",
  "composer.send": "Kirim",
  "composer.stop": "Hentikan",
  "composer.hint": "untuk kirim",
  "edits.title": "{count} perubahan sel diusulkan",
  "edits.apply": "Terapkan",
  "edits.discard": "Batalkan",
  "edits.applied": "Diterapkan",
  "edits.discarded": "Dibatalkan",
  "edits.blank": "(kosong)",
  "error.generic": "Terjadi kesalahan. Coba lagi.",
  "error.model": "Panggilan model gagal: {detail}",
  "error.noModel":
    "Kunci model belum diatur. Isi VITE_AI_GATEWAY_KEY di apps/addin/.env, lalu jalankan ulang dev server.",
  "tool.request": "Permintaan",
  "tool.response": "Hasil",
  "tool.activeSheet": "sheet aktif",
  "tool.list_sheets": "Mendaftar sheet",
  "tool.list_sheets.done": "{count} sheet",
  "tool.read_used_range": "Membaca {sheet}",
  "tool.read_range": "Membaca {range}",
  "tool.read.done": "{target} — {dims}",
  "tool.get_selection": "Membaca seleksi",
  "tool.find_cells": "Mencari “{query}”",
  "tool.find_cells.done": "{count} kecocokan",
  "tool.write_cells": "Mengusulkan {count} perubahan",
  "tool.write_formula": "Mengusulkan rumus untuk {ref}",
} satisfies typeof en;

const dictionaries: Record<Locale, typeof en> = { en, id };

export function t(
  key: keyof typeof en | (string & {}),
  params?: Record<string, string | number>,
): string {
  const dictionary = dictionaries[locale] as Record<string, string>;
  const text: string = dictionary[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}
