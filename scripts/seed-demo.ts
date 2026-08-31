/**
 * Demo data for an existing organization.
 *
 * Separate from seed-admin on purpose. That command bootstraps an organization
 * and its first administrator and has to run interactively because it takes a
 * password; this one takes nothing, attaches to whatever organization is already
 * there, and is safe to run again.
 *
 * Re-running is additive-free rather than destructive: entities, accounts,
 * reconciliations, import batches and transactions are upserted on their natural
 * unique keys, and the records with no natural key — exceptions, events,
 * activity — are only created for a reconciliation that has none. A resolution
 * you wrote by hand survives a re-run.
 *
 *   bun run db:seed-demo
 */
import { fileURLToPath } from "node:url";

import type { createPrismaClient } from "@DashboardPT2/db";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../apps/web/.env", import.meta.url)) });

/**
 * Type-only, so it is erased before runtime and cannot pull the db package in
 * ahead of the dotenv call above — which is the whole reason every real import
 * in this file is dynamic.
 */
type PrismaClient = ReturnType<typeof createPrismaClient>;

type ReconciliationStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "READY_FOR_REVIEW"
  | "SUBMITTED"
  | "APPROVED"
  | "COMPLETED"
  | "REOPENED";

/**
 * Deterministic PRNG (mulberry32).
 *
 * Demo figures must not change between runs: a screenshot taken today and the
 * same screen tomorrow should agree, and a balance that drifts every time the
 * seed runs is worse than no balance at all.
 */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Date columns are `@db.Date`; UTC midnight keeps them off a timezone edge. */
function utcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

/** The first and last day of the month `monthsAgo` before the current one. */
function period(monthsAgo: number) {
  const now = new Date();
  const anchor = utcDate(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1);
  const year = anchor.getUTCFullYear();
  const monthIndex = anchor.getUTCMonth();
  return {
    start: utcDate(year, monthIndex, 1),
    end: utcDate(year, monthIndex + 1, 0),
    label: anchor.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

const ENTITIES = [
  { code: "NWT", name: "Northwind Trading" },
  { code: "NWL", name: "Northwind Logistics" },
] as const;

const ACCOUNTS = [
  { code: "1010-OPERATING", name: "Operating account", entity: "NWT", type: "BANK" },
  { code: "1020-PAYROLL", name: "Payroll account", entity: "NWT", type: "BANK" },
  { code: "1210-MERCHANT", name: "Merchant settlement", entity: "NWT", type: "CLEARING" },
  { code: "1030-COLLECTIONS", name: "Collections account", entity: "NWL", type: "BANK" },
  { code: "1040-FX", name: "Foreign currency account", entity: "NWL", type: "BANK" },
  { code: "1220-FREIGHT", name: "Freight clearing", entity: "NWL", type: "CLEARING" },
] as const;

/**
 * Twelve closes covering all seven statuses.
 *
 * The spread is not decorative: the dashboard's four tiles filter on "in
 * progress", "awaiting approval" and "open exceptions", the archive shows only
 * approved and completed, and every one of those needs rows to be worth looking
 * at. Recent months carry the unfinished work and older ones are closed, which
 * is what a real close calendar looks like.
 */
const CLOSES: {
  account: string;
  monthsAgo: number;
  status: ReconciliationStatus;
  exceptions: number;
  pendingImport?: boolean;
}[] = [
  { account: "1010-OPERATING", monthsAgo: 0, status: "IN_PROGRESS", exceptions: 3, pendingImport: true },
  { account: "1020-PAYROLL", monthsAgo: 0, status: "DRAFT", exceptions: 0, pendingImport: true },
  { account: "1210-MERCHANT", monthsAgo: 0, status: "READY_FOR_REVIEW", exceptions: 2 },
  { account: "1030-COLLECTIONS", monthsAgo: 0, status: "IN_PROGRESS", exceptions: 1 },
  { account: "1010-OPERATING", monthsAgo: 1, status: "SUBMITTED", exceptions: 1 },
  { account: "1020-PAYROLL", monthsAgo: 1, status: "APPROVED", exceptions: 0 },
  { account: "1040-FX", monthsAgo: 1, status: "REOPENED", exceptions: 2 },
  { account: "1220-FREIGHT", monthsAgo: 1, status: "SUBMITTED", exceptions: 0 },
  { account: "1010-OPERATING", monthsAgo: 2, status: "COMPLETED", exceptions: 0 },
  { account: "1020-PAYROLL", monthsAgo: 2, status: "COMPLETED", exceptions: 0 },
  { account: "1030-COLLECTIONS", monthsAgo: 2, status: "APPROVED", exceptions: 0 },
  { account: "1210-MERCHANT", monthsAgo: 3, status: "COMPLETED", exceptions: 0 },
];

const COUNTERPARTIES = [
  "Meridian Freight",
  "Halcyon Supplies",
  "Bluewater Logistics",
  "Orbit Payments",
  "Castellan Group",
  "Ridgeway Services",
  "Pinehurst Traders",
  "Vantage Utilities",
];

const EXCEPTION_KINDS = [
  {
    type: "AMOUNT_MISMATCH",
    severity: "ERROR",
    title: "Statement and ledger amounts differ",
    detail: "The bank line and the matched journal entry disagree by more than the rounding tolerance.",
  },
  {
    type: "MISSING_COUNTERPART",
    severity: "WARNING",
    title: "No ledger entry for this deposit",
    detail: "A settlement landed on the statement with nothing posted against it.",
  },
  {
    type: "DUPLICATE",
    severity: "WARNING",
    title: "Possible duplicate payment",
    detail: "Two lines share a reference, an amount and a value date.",
  },
  {
    type: "DATE_MISMATCH",
    severity: "INFO",
    title: "Posted outside the period",
    detail: "Value date falls in this period; the ledger posted it in the next one.",
  },
] as const;

/** Status implies a history — these are the transitions that produced it. */
function eventsFor(status: ReconciliationStatus) {
  const trail: { type: string; from: ReconciliationStatus | null; to: ReconciliationStatus }[] = [
    { type: "CREATED", from: null, to: "DRAFT" },
  ];
  if (status === "DRAFT") return trail;
  trail.push({ type: "STATUS_CHANGED", from: "DRAFT", to: "IN_PROGRESS" });
  if (status === "IN_PROGRESS") return trail;
  if (status === "READY_FOR_REVIEW") {
    trail.push({ type: "STATUS_CHANGED", from: "IN_PROGRESS", to: "READY_FOR_REVIEW" });
    return trail;
  }
  trail.push({ type: "SUBMITTED", from: "IN_PROGRESS", to: "SUBMITTED" });
  if (status === "SUBMITTED") return trail;
  trail.push({ type: "APPROVED", from: "SUBMITTED", to: "APPROVED" });
  if (status === "APPROVED") return trail;
  if (status === "REOPENED") {
    trail.push({ type: "REOPENED", from: "APPROVED", to: "REOPENED" });
    return trail;
  }
  trail.push({ type: "STATUS_CHANGED", from: "APPROVED", to: "COMPLETED" });
  return trail;
}

async function main() {
  const { default: prisma } = await import("../packages/db/src/index");

  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!organization) {
    throw new Error(
      "No organization found. Run `bun run db:seed-admin` first — it creates the organization and the administrator this data attaches to.",
    );
  }

  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
    select: { userId: true },
  });
  const actorId = membership?.userId ?? null;
  const currency = organization.defaultCurrency;
  const organizationId = organization.id;

  console.log(`Seeding demo data into "${organization.name}" (${organization.code}).`);

  const entityIdByCode = new Map<string, string>();
  for (const entity of ENTITIES) {
    const saved = await prisma.legalEntity.upsert({
      where: { organizationId_code: { organizationId, code: entity.code } },
      update: { name: entity.name, baseCurrency: currency, isActive: true },
      create: {
        organizationId,
        code: entity.code,
        name: entity.name,
        baseCurrency: currency,
        registrationNumber: `REG-${entity.code}-0${ENTITIES.indexOf(entity) + 1}`,
      },
      select: { id: true },
    });
    entityIdByCode.set(entity.code, saved.id);
  }

  const accountIdByCode = new Map<string, { id: string; legalEntityId: string }>();
  for (const account of ACCOUNTS) {
    const legalEntityId = entityIdByCode.get(account.entity)!;
    const saved = await prisma.ledgerAccount.upsert({
      where: { organizationId_code: { organizationId, code: account.code } },
      update: { name: account.name, isActive: true },
      create: {
        organizationId,
        legalEntityId,
        code: account.code,
        name: account.name,
        type: account.type,
        currency,
        sourceSystem: "demo",
        externalId: account.code,
      },
      select: { id: true, legalEntityId: true },
    });
    accountIdByCode.set(account.code, saved);
  }

  let created = 0;
  for (const [index, close] of CLOSES.entries()) {
    const account = accountIdByCode.get(close.account)!;
    const accountMeta = ACCOUNTS.find((item) => item.code === close.account)!;
    const { start, end, label } = period(close.monthsAgo);
    const next = random(index * 7919 + 104729);

    const opening = Math.round(next() * 400_000 + 120_000);
    const movement = Math.round(next() * 180_000 - 60_000);
    const closing = opening + movement;
    // A close still in flight has not tied out; a settled one has.
    const settled = close.status === "APPROVED" || close.status === "COMPLETED";
    const statementBalance = settled ? closing : closing + Math.round(next() * 4_000 + 250);

    const reconciliation = await prisma.reconciliation.upsert({
      where: {
        ledgerAccountId_periodStart_periodEnd: {
          ledgerAccountId: account.id,
          periodStart: start,
          periodEnd: end,
        },
      },
      update: {},
      create: {
        organizationId,
        legalEntityId: account.legalEntityId,
        ledgerAccountId: account.id,
        name: `${accountMeta.name} — ${label}`,
        currency,
        periodStart: start,
        periodEnd: end,
        openingBalance: opening,
        closingBalance: closing,
        statementBalance,
        reconciledBalance: settled ? closing : Math.round(closing * 0.82),
        status: close.status,
        completedAt: close.status === "COMPLETED" ? end : null,
        ownerId: actorId,
        createdById: actorId,
      },
    });

    const batch = await prisma.importBatch.upsert({
      where: {
        organizationId_sourceSystem_externalBatchId: {
          organizationId,
          sourceSystem: "demo",
          externalBatchId: `${close.account}-${close.monthsAgo}`,
        },
      },
      update: {},
      create: {
        organizationId,
        legalEntityId: account.legalEntityId,
        ledgerAccountId: account.id,
        reconciliationId: reconciliation.id,
        createdById: actorId,
        source: "BANK_STATEMENT",
        sourceSystem: "demo",
        externalBatchId: `${close.account}-${close.monthsAgo}`,
        originalFilename: `${close.account.toLowerCase()}-${label.replace(/\s+/g, "-").toLowerCase()}.csv`,
        contentType: "text/csv",
        sizeBytes: BigInt(18_000 + index * 1_100),
        status: close.pendingImport ? "PENDING" : "COMPLETED",
        rowCount: 12,
        importedCount: close.pendingImport ? 0 : 12,
        startedAt: close.pendingImport ? null : end,
        completedAt: close.pendingImport ? null : end,
      },
    });

    const lines = 8 + Math.floor(next() * 5);
    const transactionIds: string[] = [];
    for (let line = 0; line < lines; line += 1) {
      const day = 1 + Math.floor(next() * 26);
      const amount = Math.round((next() * 24_000 + 500) * 100) / 100;
      const credit = next() > 0.45;
      const transaction = await prisma.transaction.upsert({
        where: {
          importBatchId_sourceRecordId: {
            importBatchId: batch.id,
            sourceRecordId: `L${String(line + 1).padStart(3, "0")}`,
          },
        },
        update: {},
        create: {
          organizationId,
          importBatchId: batch.id,
          ledgerAccountId: account.id,
          reconciliationId: reconciliation.id,
          sourceRecordId: `L${String(line + 1).padStart(3, "0")}`,
          sourceLineNumber: line + 1,
          effectiveDate: utcDate(start.getUTCFullYear(), start.getUTCMonth(), day),
          amount,
          currency,
          direction: credit ? "CREDIT" : "DEBIT",
          description: credit ? "Customer settlement" : "Supplier payment",
          reference: `${accountMeta.code.split("-")[0]}/${String(line + 1).padStart(4, "0")}`,
          counterparty: COUNTERPARTIES[Math.floor(next() * COUNTERPARTIES.length)],
        },
        select: { id: true },
      });
      transactionIds.push(transaction.id);
    }

    // Exceptions, events and activity have no natural unique key, so they are
    // written once and left alone afterwards. Re-running the seed must not
    // reopen an exception somebody resolved.
    const existingExceptions = await prisma.reconciliationException.count({
      where: { organizationId, reconciliationId: reconciliation.id },
    });
    if (existingExceptions === 0) {
      for (let n = 0; n < close.exceptions; n += 1) {
        const kind = EXCEPTION_KINDS[n % EXCEPTION_KINDS.length];
        await prisma.reconciliationException.create({
          data: {
            organizationId,
            reconciliationId: reconciliation.id,
            transactionId: transactionIds[n] ?? null,
            assignedToId: actorId,
            type: kind.type,
            severity: kind.severity,
            status: "OPEN",
            title: kind.title,
            detail: kind.detail,
            amount: Math.round((next() * 6_000 + 120) * 100) / 100,
          },
        });
      }
      // One settled close carries a resolved exception, so the workflow has
      // visible history rather than only open work.
      if (settled && close.monthsAgo >= 2) {
        await prisma.reconciliationException.create({
          data: {
            organizationId,
            reconciliationId: reconciliation.id,
            assignedToId: actorId,
            resolvedById: actorId,
            type: "MISSING_COUNTERPART",
            severity: "WARNING",
            status: "RESOLVED",
            title: "Unmatched bank charge",
            detail: "Quarterly custody fee arrived without a matching accrual.",
            amount: 480,
            resolution: "Accrual posted in the same period; the fee now matches the ledger entry.",
            resolvedAt: end,
          },
        });
      }
    }

    const existingEvents = await prisma.reconciliationEvent.count({
      where: { organizationId, reconciliationId: reconciliation.id },
    });
    if (existingEvents === 0) {
      const trail = eventsFor(close.status);
      for (const [step, event] of trail.entries()) {
        const occurredAt = new Date(end.getTime() + step * 3_600_000);
        await prisma.reconciliationEvent.create({
          data: {
            organizationId,
            reconciliationId: reconciliation.id,
            actorId,
            type: event.type,
            fromStatus: event.from,
            toStatus: event.to,
            occurredAt,
          },
        });
        await prisma.activityLog.create({
          data: {
            organizationId,
            actorId,
            action: event.type,
            resourceType: "Reconciliation",
            resourceId: reconciliation.id,
            occurredAt,
          },
        });
      }
    }

    created += 1;
    console.log(`  ${close.status.padEnd(17)} ${reconciliation.name}`);
  }

  await seedThreads(prisma, organizationId, actorId);

  const [reconciliations, transactions, openExceptions] = await Promise.all([
    prisma.reconciliation.count({ where: { organizationId } }),
    prisma.transaction.count({ where: { organizationId } }),
    prisma.reconciliationException.count({ where: { organizationId, status: "OPEN" } }),
  ]);

  console.log(
    `\nDone. ${created} closes seeded — the organization now holds ${reconciliations} reconciliations, ${transactions} transactions and ${openExceptions} open exceptions.`,
  );
}

/**
 * Four example threads, run through the real agent.
 *
 * Deliberately not hand-written bodies: the agent is the thing being
 * demonstrated, so the demo threads are produced by calling it, against the data
 * this script has just seeded. That also means they cannot drift from the
 * renderer — if the body shape changes, these change with it.
 *
 * Skipped entirely once the user has any thread of their own, so a re-run never
 * buries real work under samples.
 */
async function seedThreads(
  prisma: PrismaClient,
  organizationId: string,
  actorId: string | null,
) {
  if (!actorId) {
    console.log("\n  no organization member found — skipping demo threads");
    return;
  }
  const existing = await prisma.conversation.count({ where: { organizationId, userId: actorId } });
  if (existing > 0) {
    console.log(`\n  ${existing} thread(s) already present — leaving them alone`);
    return;
  }

  const { runAgent, titleFromMessage } = await import("../packages/api/src/lib/agent-script");

  const prompts = [
    "Reconcile the operating account for this period",
    "Summarise the open exceptions",
    "Where does the close stand?",
    "Find items over 10,000",
  ];

  for (const [index, message] of prompts.entries()) {
    const body = await runAgent(prisma, { organizationId, message });
    // Spaced an hour apart, oldest first, so the history list has an order that
    // is not "all at once".
    const at = new Date(Date.now() - (prompts.length - index) * 3_600_000);
    const conversation = await prisma.conversation.create({
      data: {
        organizationId,
        userId: actorId,
        title: titleFromMessage(message),
        createdAt: at,
        updatedAt: at,
      },
    });
    await prisma.chatMessage.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        role: "USER",
        body: { text: message, attachments: [] },
        createdAt: at,
      },
    });
    await prisma.chatMessage.create({
      data: {
        organizationId,
        conversationId: conversation.id,
        role: "AGENT",
        body,
        createdAt: new Date(at.getTime() + 4_000),
      },
    });
    console.log(`  thread            ${conversation.title}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
