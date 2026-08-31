import { financeDatabase } from "../lib/finance-database";
import { requireFinancePermission } from "../lib/finance-permissions";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

/**
 * Read-only views over the organization's own administration.
 *
 * Nothing here writes. Membership and entity records are created by the seed
 * command and by an administrator working directly against the database; these
 * procedures exist so the product can *show* who and what is in scope, which is
 * the first question anyone reviewing a close asks.
 *
 * Entities deliberately do not get a procedure of their own — reconciliation.
 * options already returns the active legal entities and ledger accounts for the
 * create form, and a second query over the same two tables would be one more
 * place for the scoping to drift.
 */
export const adminRouter = {
  members: {
    /**
     * Who belongs to this organization and what they may do.
     *
     * Two roles per person, and both matter: `role` on the membership is the
     * authority inside this organization (who may approve), while the user's own
     * role is the account's authority across the product. They are usually the
     * same and the times they are not are exactly what an administrator opens
     * this page to find.
     *
     * Unpaginated on purpose. This is an organization's staff list, not a data
     * table — if it ever needs a cursor, the organization has outgrown a single
     * close workflow and this is not the change that should discover that.
     */
    list: organizationProcedure.handler(async ({ context }) => {
      requireFinancePermission(context.organization.role, "member:read");
      const database = financeDatabase(context.database);

      const memberships = await database.organizationMembership.findMany({
        where: { organizationId: context.organization.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              role: true,
              mustChangePassword: true,
              trialEndsAt: true,
              createdAt: true,
            },
          },
        },
        // Owners first, then alphabetically — the ordering someone scanning for
        // "who can approve this" reads in.
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      });

      return serializeFinanceValue({
        items: memberships.map((membership) => ({
          id: membership.id,
          membershipRole: membership.role,
          joinedAt: membership.createdAt,
          user: membership.user,
        })),
      });
    }),
  },
};
