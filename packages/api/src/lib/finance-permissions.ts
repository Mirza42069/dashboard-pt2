import { ORPCError } from "@orpc/server";

export type FinancePermission =
  | "reconciliation:create"
  | "import:create"
  | "exception:resolve"
  | "workflow:submit"
  | "workflow:approve"
  | "workflow:reopen"
  /** Reading the organization's own roster — who can act, and as what. */
  | "member:read";

const ADMIN_ROLES = new Set(["owner", "super_admin", "admin", "administrator"]);
const PREPARER_ROLES = new Set(["preparer", "accountant", "user"]);
const REVIEWER_ROLES = new Set(["approver", "reviewer", "controller"]);

export function normalizedFinanceRole(role: string | null | undefined) {
  return role?.trim().toLowerCase() ?? "viewer";
}

export function hasFinancePermission(role: string, permission: FinancePermission) {
  if (ADMIN_ROLES.has(role)) return true;
  /**
   * Administration is the one area with no non-admin path. Every other
   * permission below widens from admin to some working role; this one does not,
   * because the roster names people and their authority, which a preparer has
   * no operational reason to enumerate.
   */
  if (permission === "member:read") return false;
  if (permission === "workflow:approve" || permission === "workflow:reopen") {
    return REVIEWER_ROLES.has(role);
  }
  return PREPARER_ROLES.has(role);
}

export function requireFinancePermission(role: string, permission: FinancePermission) {
  if (!hasFinancePermission(role, permission)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Your organization role does not permit this action.",
    });
  }
}
