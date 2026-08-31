import { expect, test } from "bun:test";

import { ledgerAccountCodeFromName } from "./finance-defaults";

test("the same account name always derives the same code", () => {
  // This is the whole contract: the code is what ties two periods to one
  // account, so casing, spacing and punctuation must not split them.
  expect(ledgerAccountCodeFromName("Operating account")).toBe("OPERATING-ACCOUNT");
  expect(ledgerAccountCodeFromName("  operating   account  ")).toBe("OPERATING-ACCOUNT");
  expect(ledgerAccountCodeFromName("Operating & account")).toBe("OPERATING-ACCOUNT");
  expect(ledgerAccountCodeFromName("Operating — account!")).toBe("OPERATING-ACCOUNT");
});

test("different names derive different accounts", () => {
  expect(ledgerAccountCodeFromName("Operating account — March")).not.toBe(
    ledgerAccountCodeFromName("Operating account — April"),
  );
});

test("non-Latin names keep their own letters", () => {
  // A hyphen-only code would collapse every account in the organization onto
  // one record, and with it the duplicate-period guard.
  expect(ledgerAccountCodeFromName("Rekening operasional")).toBe("REKENING-OPERASIONAL");
  expect(ledgerAccountCodeFromName("運転資金")).toBe("運転資金");
});

test("a name with nothing to slug still yields a usable code", () => {
  expect(ledgerAccountCodeFromName("———")).toBe("GENERAL");
  expect(ledgerAccountCodeFromName("   ")).toBe("GENERAL");
});

test("a long name is truncated without a trailing separator", () => {
  const code = ledgerAccountCodeFromName(
    "Operating account for the consolidated group entity",
  );
  expect(code.length).toBeLessThanOrEqual(40);
  expect(code.endsWith("-")).toBe(false);
  expect(code.startsWith("OPERATING-ACCOUNT-FOR-THE-CONSOLIDATED")).toBe(true);
});
