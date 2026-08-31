import { expect, test } from "bun:test";

import { matchIntent, parseThreshold, titleFromMessage } from "./agent-script";

test("each intent is reachable from how someone would actually ask", () => {
  expect(matchIntent("Reconcile the operating account for March")).toBe("reconcile_account");
  expect(matchIntent("Summarise the open exceptions")).toBe("open_exceptions");
  expect(matchIntent("Where does the close stand?")).toBe("close_status");
  expect(matchIntent("Find items over 10,000")).toBe("large_items");
});

test("Indonesian reaches the same intents", () => {
  // The matcher runs on the server, where the reader's locale is not known —
  // so both languages have to hit, whichever UI language is set.
  expect(matchIntent("Tolong rekonsiliasi rekening operasional")).toBe("reconcile_account");
  expect(matchIntent("Ada pengecualian apa saja?")).toBe("open_exceptions");
  expect(matchIntent("Bagaimana penutupan bulan ini?")).toBe("close_status");
  expect(matchIntent("Cari transaksi di atas 5.000")).toBe("large_items");
});

test("overlapping phrasing resolves by order, not by accident", () => {
  // Mentions both a threshold and reconciling; the threshold is the specific
  // request and is matched first on purpose.
  expect(matchIntent("reconcile anything over 20,000")).toBe("large_items");
  // Mentions reconciling and exceptions; reconciling is the verb being asked for.
  expect(matchIntent("reconcile the account and show me the exceptions")).toBe(
    "reconcile_account",
  );
});

test("anything unrecognised falls back rather than guessing", () => {
  expect(matchIntent("what is the weather")).toBe("fallback");
  expect(matchIntent("")).toBe("fallback");
  // A confident wrong answer is the one failure mode a finance tool cannot have.
  expect(matchIntent("delete everything")).toBe("fallback");
});

test("thresholds parse in both number conventions", () => {
  expect(parseThreshold("items over 10,000")).toBe(10000);
  expect(parseThreshold("items over $10,000")).toBe(10000);
  expect(parseThreshold("transaksi di atas 5.000")).toBe(5000);
  expect(parseThreshold("more than 250")).toBe(250);
});

test("a message with no threshold reports none rather than zero", () => {
  // Zero would silently become "every transaction", which is not what was asked.
  expect(parseThreshold("show me the big items")).toBeNull();
  expect(parseThreshold("reconcile the operating account")).toBeNull();
});

test("titles are trimmed to something a history row can hold", () => {
  expect(titleFromMessage("  Reconcile   the operating account  ")).toBe(
    "Reconcile the operating account",
  );
  const long = titleFromMessage("x".repeat(200));
  expect(long.length).toBeLessThanOrEqual(60);
  expect(long.endsWith("…")).toBe(true);
  expect(titleFromMessage("   ")).toBe("Untitled");
});
