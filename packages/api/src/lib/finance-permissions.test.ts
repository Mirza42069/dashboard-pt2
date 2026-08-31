import { expect, test } from "bun:test";

import { hasFinancePermission, normalizedFinanceRole } from "./finance-permissions";

test("finance mutation grants separate preparers from reviewers", () => {
  expect(hasFinancePermission("preparer", "workflow:submit")).toBe(true);
  expect(hasFinancePermission("preparer", "workflow:approve")).toBe(false);
  expect(hasFinancePermission("reviewer", "workflow:approve")).toBe(true);
  expect(hasFinancePermission("reviewer", "exception:resolve")).toBe(false);
  expect(hasFinancePermission("admin", "workflow:approve")).toBe(true);
});

test("unknown and absent roles degrade to read-only viewer", () => {
  expect(normalizedFinanceRole(undefined)).toBe("viewer");
  expect(normalizedFinanceRole("  CONTROLLER ")).toBe("controller");
  expect(hasFinancePermission(normalizedFinanceRole("unexpected"), "import:create")).toBe(false);
});
