import { expect, test } from "bun:test";

import { importObjectPrefix, originalObjectPath, sha256 } from "./import-storage";

test("original import paths are tenant scoped and sanitized", () => {
  const path = originalObjectPath("org_1", "batch_1", "Bank statement (final).xlsx");
  expect(path.startsWith(`${importObjectPrefix("org_1", "batch_1")}/original/`)).toBe(true);
  expect(path.endsWith("-Bank-statement-final-.xlsx")).toBe(true);
  expect(path).not.toContain("(");
});

test("sha256 accepts strings and array buffers", () => {
  const bytes = new TextEncoder().encode("coretax");
  expect(sha256("coretax")).toBe(sha256(bytes.buffer));
});
