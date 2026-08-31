import type { Role } from "../lib/permissions";
import { companies } from "./data";

/**
 * The account fields the product needs that better-auth does not yet carry.
 *
 * In the React template these are columns on `user`, declared as better-auth
 * `additionalFields` and written server-side only. Adding them here would mean
 * a Prisma schema change and a migration, which is the database port — out of
 * scope for the UI work. So while the app runs on fixtures, this is where a
 * signed-in account's role, tenant and trial come from.
 *
 * When the real columns land, every caller switches to reading them off
 * `session.user` and this module goes away. Nothing else has to change: the
 * shape below is exactly the subset of the template's user row that the chrome
 * and the routers read.
 */
export type MockProfile = {
  role: Role;
  /** Null for super admins, who choose an active company instead. */
  companyId: string | null;
  /** Null means "not a trial account". */
  trialEndsAt: Date | null;
  mustChangePassword: boolean;
};

/**
 * Everyone signs in as the same demo profile for now — a super admin, so the
 * ported chrome exercises every permission-gated control (company switcher,
 * admin section, activity feed) rather than hiding most of it.
 */
export function mockProfileFor(_user: { id: string; email: string }): MockProfile {
  return {
    role: "super_admin",
    companyId: null,
    trialEndsAt: null,
    mustChangePassword: false,
  };
}

/** The company a request resolves against, honouring the switcher's cookie. */
export function resolveCompanyId(profile: MockProfile, cookieValue?: string): string {
  if (profile.companyId) return profile.companyId;
  if (cookieValue && companies.some((row) => row.id === cookieValue)) return cookieValue;
  return companies[0]!.id;
}
