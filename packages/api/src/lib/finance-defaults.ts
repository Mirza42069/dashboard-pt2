import type { FinanceDatabase } from "./finance-database";

/**
 * The legal entity created when an organization has none.
 *
 * Only ever reached on an organization that skipped `db:seed-admin`, since that
 * command creates an entity of its own. It exists so that creating the first
 * reconciliation cannot fail on a record the person creating it never asked for.
 */
const FALLBACK_ENTITY_CODE = "MAIN";

/**
 * A ledger account code derived from what the reconciliation is called.
 *
 * The account is the subject of a reconciliation — `@@unique([ledgerAccountId,
 * periodStart, periodEnd])` is what stops the same account being closed twice
 * for one period — but the create form no longer asks for one, so the name has
 * to carry that identity.
 *
 * The consequence is deliberate and worth stating: two reconciliations named
 * the same thing are the same account, so naming them "Operating account" in
 * March and again in April gives one account with two periods, which is
 * correct. Naming them "Operating account — March" and "Operating account —
 * April" gives two accounts, which is not what the domain means but is exactly
 * what was asked for, and the duplicate-period guard still holds within each.
 *
 * Unicode-aware: an organization writing account names in a non-Latin script
 * should get its own letters back, not a string of hyphens.
 */
export function ledgerAccountCodeFromName(name: string): string {
  const code = name
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toUpperCase()
    .slice(0, 40)
    // A 40-character cut can land on a separator; a trailing hyphen would make
    // "Operating account name that is long-" and "…long" two different codes.
    .replace(/-+$/u, "");
  return code || "GENERAL";
}

export type ReconciliationTarget = {
  legalEntityId: string;
  ledgerAccountId: string;
};

/**
 * The entity and account a new reconciliation belongs to, created if absent.
 *
 * The account is looked up by name before anything is derived, and that order
 * matters. A real chart of accounts numbers its accounts — the demo seed uses
 * `1010-OPERATING` for "Operating account", and an ERP import would do the same
 * — so deriving a code straight from the name would quietly open a *second*
 * account beside the one the reader meant. Matching the name first means typing
 * what you see on the accounts page reuses the account you see.
 *
 * Only when no account carries that name is a code derived and upserted. The
 * upsert is not a find-then-create: two people opening the same period at the
 * same moment would race, and the loser would get a unique-constraint error
 * instead of a reconciliation.
 *
 * The entity comes from the account rather than being passed alongside it. The
 * FK is compound (`[organizationId, legalEntityId]` / `[organizationId,
 * ledgerAccountId]`), so an account that already exists under a different entity
 * must bring its own — otherwise the pair is inconsistent and the insert fails
 * at the database rather than here.
 */
export async function resolveReconciliationTarget(
  database: FinanceDatabase,
  input: {
    organizationId: string;
    organizationName: string;
    /** The reconciliation's name; the account is matched, then derived, from it. */
    name: string;
    currency: string;
  },
): Promise<ReconciliationTarget> {
  const { organizationId, organizationName, currency } = input;

  // Any active entity will do — an organization that has been set up properly
  // has one, and which one it is was never the caller's decision to make.
  const existingEntity = await database.legalEntity.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const legalEntityId =
    existingEntity?.id ??
    (
      await database.legalEntity.upsert({
        where: { organizationId_code: { organizationId, code: FALLBACK_ENTITY_CODE } },
        update: {},
        create: {
          organizationId,
          name: organizationName,
          code: FALLBACK_ENTITY_CODE,
          baseCurrency: currency,
        },
        select: { id: true },
      })
    ).id;

  // Name first — see the note above. Case-insensitive because "Operating
  // account" and "operating account" are the same account to everyone but a
  // byte comparison; oldest wins if two somehow share a name.
  const byName = await database.ledgerAccount.findFirst({
    where: {
      organizationId,
      isActive: true,
      name: { equals: input.name.trim(), mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, legalEntityId: true },
  });
  if (byName) {
    return { legalEntityId: byName.legalEntityId, ledgerAccountId: byName.id };
  }

  const code = ledgerAccountCodeFromName(input.name);
  const account = await database.ledgerAccount.upsert({
    where: { organizationId_code: { organizationId, code } },
    update: {},
    create: {
      organizationId,
      legalEntityId,
      code,
      name: input.name,
      // BANK because that is what this product reconciles. An organization that
      // needs the other six types has outgrown a create form with three fields.
      type: "BANK",
      currency,
    },
    select: { id: true, legalEntityId: true },
  });

  return { legalEntityId: account.legalEntityId, ledgerAccountId: account.id };
}
