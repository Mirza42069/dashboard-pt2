import { ConvexError, v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { assertTimestamp, makeToken, requireOrganization, requireOwnedDocument, writeAudit } from "./domain";
import { runQris, type QrisResult } from "./payments";

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    if (!/^pay_[a-f0-9]{32}$/.test(token)) return null;
    const link = await ctx.db.query("paymentLinks").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (!link || link.status !== "active" || (link.expiresAt !== undefined && link.expiresAt <= Date.now())) return null;
    const invoice = await ctx.db.get(link.invoiceId);
    if (!invoice || invoice.organizationId !== link.organizationId || invoice.status === "void" || invoice.status === "draft") return null;
    const [organization, property, room, items, paymentRequests] = await Promise.all([
      ctx.db.get(invoice.organizationId),
      ctx.db.get(invoice.propertyId),
      ctx.db.get(invoice.roomId),
      ctx.db.query("invoiceItems").withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id)).collect(),
      ctx.db.query("paymentRequests").withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id)).order("desc").collect(),
    ]);
    if (!organization || !property || !room || property.organizationId !== invoice.organizationId || room.organizationId !== invoice.organizationId) return null;
    const account = await ctx.db.query("xenditAccounts").withIndex("by_organization", (q) => q.eq("organizationId", invoice.organizationId)).unique();
    const qris = invoice.status !== "paid" && account?.verifiedAt && account.status === "active" && account.qrisEnabled
      ? paymentRequests.find((item) => item.status === "pending" && item.businessId === account.businessId && item.amount === invoice.total && item.qrString && item.expiresAt > Date.now()) : undefined;
    return {
      organizationName: organization.name,
      propertyName: property.name,
      roomNumber: room.number,
      invoice: {
        number: invoice.number,
        period: invoice.period,
        dueAt: invoice.dueAt,
        total: invoice.total,
        currency: "IDR" as const,
        status: invoice.status,
      },
      items: items.filter((item) => item.organizationId === invoice.organizationId).map((item) => ({ description: item.description, quantity: item.quantity, unitAmount: item.unitAmount, amount: item.amount })),
      qris: qris ? { qrString: qris.qrString, amount: qris.amount, currency: qris.currency, expiresAt: qris.expiresAt } : null,
    };
  },
});

export const createQris = action({
  args: { token: v.string() },
  handler: async (ctx, { token }): Promise<QrisResult> => {
    if (!/^pay_[a-f0-9]{32}$/.test(token)) return { status: "unavailable" };
    try {
      return await runQris(ctx, { kind: "token", token }, 30);
    } catch {
      // Do not expose membership, invoice IDs, provider errors or account configuration.
      return { status: "unavailable" };
    }
  },
});

export const createLink = mutation({
  args: { organizationId: v.id("organizations"), invoiceId: v.id("invoices"), expiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    const invoice = await requireOwnedDocument(await ctx.db.get(args.invoiceId), args.organizationId, "Tagihan");
    if (invoice.status === "void" || invoice.status === "draft") throw new ConvexError("Tautan tidak dapat dibuat untuk tagihan ini.");
    if (args.expiresAt !== undefined) assertTimestamp(args.expiresAt, "Masa berlaku tautan");
    if (args.expiresAt !== undefined && args.expiresAt <= Date.now()) throw new ConvexError("Masa berlaku tautan harus berada di masa depan.");
    const existing = await ctx.db.query("paymentLinks").withIndex("by_organization_invoice", (q) => q.eq("organizationId", args.organizationId).eq("invoiceId", args.invoiceId)).filter((q) => q.eq(q.field("status"), "active")).first();
    if (existing && (existing.expiresAt === undefined || existing.expiresAt > Date.now())) return existing;
    if (existing) await ctx.db.patch(existing._id, { status: "revoked", updatedAt: Date.now() });
    const now = Date.now();
    const id = await ctx.db.insert("paymentLinks", { organizationId: args.organizationId, invoiceId: args.invoiceId, token: makeToken("pay"), status: "active", expiresAt: args.expiresAt, createdAt: now, updatedAt: now });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "payment_link.created", entityType: "payment_link", entityId: id });
    return ctx.db.get(id);
  },
});

export const revokeLink = mutation({
  args: { organizationId: v.id("organizations"), paymentLinkId: v.id("paymentLinks") },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    const link = await ctx.db.get(args.paymentLinkId);
    if (!link || link.organizationId !== args.organizationId) throw new ConvexError("Tautan pembayaran tidak ditemukan.");
    await ctx.db.patch(link._id, { status: "revoked", updatedAt: Date.now() });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "payment_link.revoked", entityType: "payment_link", entityId: link._id });
    return { revoked: true };
  },
});
