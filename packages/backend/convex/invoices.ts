import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { assertIdr, assertText, assertTimestamp, makeInvoiceNumber, requireOrganization, requireOwnedDocument, writeAudit } from "./domain";

const itemValidator = v.object({
  description: v.string(),
  quantity: v.number(),
  unitAmount: v.number(),
});

function currentPeriod(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")!.value;
  const month = parts.find((part) => part.type === "month")!.value;
  return `${year}-${month}`;
}

function validatePeriod(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new ConvexError("Periode tagihan harus menggunakan format YYYY-MM.");
  }
  return period;
}

function dueAtForPeriod(period: string, billingDay: number) {
  const [year, month] = period.split("-").map(Number);
  // 17:00 UTC on the previous date is midnight in Jakarta.
  return Date.UTC(year, month - 1, billingDay) - 7 * 60 * 60 * 1000;
}

function periodBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000;
  const end = Date.UTC(year, month, 1) - 7 * 60 * 60 * 1000 - 1;
  return { start, end };
}

async function generateForOrganization(ctx: MutationCtx, organizationId: Id<"organizations">, period: string) {
  validatePeriod(period);
  const leases = await ctx.db
    .query("leases")
    .withIndex("by_organization_status", (q) => q.eq("organizationId", organizationId).eq("status", "active"))
    .collect();
  const now = Date.now();
  const bounds = periodBounds(period);
  let created = 0;

  for (const lease of leases) {
    if (lease.startDate > bounds.end || (lease.endDate !== undefined && lease.endDate < bounds.start)) continue;
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_lease_period", (q) => q.eq("leaseId", lease._id).eq("period", period))
      .unique();
    if (existing) continue;

    const invoiceId = await ctx.db.insert("invoices", {
      organizationId,
      leaseId: lease._id,
      tenantId: lease.tenantId,
      propertyId: lease.propertyId,
      roomId: lease.roomId,
      number: makeInvoiceNumber(now),
      period,
      issuedAt: now,
      dueAt: dueAtForPeriod(period, lease.billingDay),
      subtotal: lease.monthlyRent,
      total: lease.monthlyRent,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("invoiceItems", {
      organizationId,
      invoiceId,
      description: `Sewa kamar periode ${period}`,
      quantity: 1,
      unitAmount: lease.monthlyRent,
      amount: lease.monthlyRent,
      createdAt: now,
    });
    created += 1;
  }
  return created;
}

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    status: v.optional(v.union(v.literal("draft"), v.literal("pending"), v.literal("paid"), v.literal("overdue"), v.literal("void"))),
  },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    const invoices = args.status
      ? await ctx.db.query("invoices").withIndex("by_organization_status", (q) => q.eq("organizationId", args.organizationId).eq("status", args.status!)).order("desc").collect()
      : await ctx.db.query("invoices").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).order("desc").collect();
    return Promise.all(invoices.map(async (invoice) => ({
      ...invoice,
      tenant: await ctx.db.get(invoice.tenantId),
      room: await ctx.db.get(invoice.roomId),
      items: await ctx.db.query("invoiceItems").withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id)).collect(),
    })));
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    leaseId: v.id("leases"),
    period: v.string(),
    dueAt: v.number(),
    items: v.array(itemValidator),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin", "staff"]);
    const lease = await requireOwnedDocument(await ctx.db.get(args.leaseId), args.organizationId, "Sewa");
    const period = validatePeriod(args.period);
    assertTimestamp(args.dueAt, "Tanggal jatuh tempo");
    if (args.items.length === 0) throw new ConvexError("Tagihan harus memiliki setidaknya satu rincian.");
    const existing = await ctx.db.query("invoices").withIndex("by_lease_period", (q) => q.eq("leaseId", args.leaseId).eq("period", period)).unique();
    if (existing) throw new ConvexError("Tagihan untuk periode sewa ini sudah ada.");

    const normalizedItems = args.items.map((item) => {
      if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) throw new ConvexError("Jumlah rincian tagihan harus berupa bilangan bulat positif.");
      const unitAmount = assertIdr(item.unitAmount, "Harga satuan");
      const amount = item.quantity * unitAmount;
      assertIdr(amount, "Jumlah rincian");
      return { description: assertText(item.description, "Deskripsi rincian"), quantity: item.quantity, unitAmount, amount };
    });
    const total = normalizedItems.reduce((sum, item) => sum + item.amount, 0);
    assertIdr(total, "Total tagihan");
    if (total === 0) throw new ConvexError("Total tagihan harus lebih dari nol.");
    const now = Date.now();
    const invoiceId = await ctx.db.insert("invoices", {
      organizationId: args.organizationId,
      leaseId: lease._id,
      tenantId: lease.tenantId,
      propertyId: lease.propertyId,
      roomId: lease.roomId,
      number: makeInvoiceNumber(now),
      period,
      issuedAt: now,
      dueAt: args.dueAt,
      subtotal: total,
      total,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    for (const item of normalizedItems) {
      await ctx.db.insert("invoiceItems", { organizationId: args.organizationId, invoiceId, ...item, createdAt: now });
    }
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "invoice.created", entityType: "invoice", entityId: invoiceId });
    return ctx.db.get(invoiceId);
  },
});

export const generateMonthly = mutation({
  args: { organizationId: v.id("organizations"), period: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    const period = args.period ?? currentPeriod();
    const created = await generateForOrganization(ctx, args.organizationId, period);
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "invoice.monthly_generated", entityType: "organization", entityId: args.organizationId, metadata: { period, created } });
    return { period, created };
  },
});

export const runDailyBilling = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const period = currentPeriod(now);
    const organizations = await ctx.db.query("organizations").collect();
    let created = 0;
    let markedOverdue = 0;
    for (const organization of organizations) {
      created += await generateForOrganization(ctx, organization._id, period);
      const pending = await ctx.db
        .query("invoices")
        .withIndex("by_organization_status", (q) => q.eq("organizationId", organization._id).eq("status", "pending"))
        .collect();
      for (const invoice of pending) {
        if (invoice.dueAt < now) {
          await ctx.db.patch(invoice._id, { status: "overdue", updatedAt: now });
          markedOverdue += 1;
        }
      }
    }
    return { period, created, markedOverdue };
  },
});
