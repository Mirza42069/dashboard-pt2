import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { makeInvoiceNumber, requireOrganization, writeAudit } from "./domain";

export const createDemo = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const { user } = await requireOrganization(ctx, organizationId, ["owner"]);
    const existing = await ctx.db.query("properties").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).first();
    if (existing) return { created: false, message: "Data demo tidak dibuat karena organisasi sudah memiliki properti." };

    const now = Date.now();
    const propertyId = await ctx.db.insert("properties", {
      organizationId,
      name: "Kos Melati",
      address: "Jl. Melati No. 17",
      city: "Jakarta Selatan",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const roomTypeId = await ctx.db.insert("roomTypes", {
      organizationId,
      propertyId,
      name: "Kamar Standard",
      monthlyRate: 1_500_000,
      capacity: 1,
      createdAt: now,
      updatedAt: now,
    });
    const roomId = await ctx.db.insert("rooms", {
      organizationId,
      propertyId,
      roomTypeId,
      number: "A-01",
      floor: "1",
      monthlyRate: 1_500_000,
      status: "occupied",
      createdAt: now,
      updatedAt: now,
    });
    const availableRoomId = await ctx.db.insert("rooms", {
      organizationId,
      propertyId,
      roomTypeId,
      number: "A-02",
      floor: "1",
      monthlyRate: 1_500_000,
      status: "available",
      createdAt: now,
      updatedAt: now,
    });
    const tenantId = await ctx.db.insert("tenants", {
      organizationId,
      fullName: "Budi Santoso",
      phone: "081200000000",
      email: "budi.demo@example.com",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const leaseId = await ctx.db.insert("leases", {
      organizationId,
      propertyId,
      roomId,
      tenantId,
      startDate: now,
      monthlyRent: 1_500_000,
      securityDeposit: 1_500_000,
      billingDay: 5,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const date = new Date(now);
    const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const invoiceId = await ctx.db.insert("invoices", {
      organizationId,
      leaseId,
      tenantId,
      propertyId,
      roomId,
      number: makeInvoiceNumber(now),
      period,
      issuedAt: now,
      dueAt: now + 7 * 24 * 60 * 60 * 1000,
      subtotal: 1_500_000,
      total: 1_500_000,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("invoiceItems", { organizationId, invoiceId, description: `Sewa kamar periode ${period}`, quantity: 1, unitAmount: 1_500_000, amount: 1_500_000, createdAt: now });
    await ctx.db.insert("expenses", { organizationId, propertyId, category: "Kebersihan", description: "Perlengkapan kebersihan bulanan", amount: 250_000, vendor: "Toko Bersih", incurredAt: now, createdAt: now, updatedAt: now });
    await ctx.db.insert("maintenanceTickets", { organizationId, propertyId, roomId: availableRoomId, title: "Periksa keran kamar mandi", description: "Keran menetes dan perlu penggantian seal.", priority: "medium", status: "open", reportedAt: now, createdAt: now, updatedAt: now });
    await writeAudit(ctx, { organizationId, authUserId: user._id, action: "seed.demo_created", entityType: "organization", entityId: organizationId });
    return { created: true, propertyId, roomId, tenantId, leaseId, invoiceId };
  },
});
