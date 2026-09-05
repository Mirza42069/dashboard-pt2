import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertIdr, assertTimestamp, requireOrganization, requireOwnedDocument, writeAudit } from "./domain";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    const leases = await ctx.db.query("leases").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect();
    return Promise.all(leases.map(async (lease) => ({
      ...lease,
      property: await ctx.db.get(lease.propertyId),
      room: await ctx.db.get(lease.roomId),
      tenant: await ctx.db.get(lease.tenantId),
    })));
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    monthlyRent: v.number(),
    securityDeposit: v.number(),
    billingDay: v.number(),
    activate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    await requireOwnedDocument(await ctx.db.get(args.propertyId), args.organizationId, "Properti");
    const room = await requireOwnedDocument(await ctx.db.get(args.roomId), args.organizationId, "Kamar");
    await requireOwnedDocument(await ctx.db.get(args.tenantId), args.organizationId, "Penyewa");
    if (room.propertyId !== args.propertyId) throw new ConvexError("Kamar tidak berada di properti yang dipilih.");
    if (!Number.isInteger(args.billingDay) || args.billingDay < 1 || args.billingDay > 28) {
      throw new ConvexError("Tanggal tagihan harus antara 1 dan 28.");
    }
    assertTimestamp(args.startDate, "Tanggal mulai");
    if (args.endDate !== undefined) {
      assertTimestamp(args.endDate, "Tanggal selesai");
      if (args.endDate < args.startDate) throw new ConvexError("Tanggal selesai tidak boleh mendahului tanggal mulai.");
    }
    const activeLease = await ctx.db.query("leases").withIndex("by_room_status", (q) => q.eq("roomId", args.roomId).eq("status", "active")).first();
    if (args.activate !== false && activeLease) throw new ConvexError("Kamar masih memiliki sewa aktif.");
    if (args.activate !== false && room.status !== "available") throw new ConvexError("Kamar harus berstatus tersedia sebelum sewa diaktifkan.");

    const now = Date.now();
    const leaseId = await ctx.db.insert("leases", {
      organizationId: args.organizationId,
      propertyId: args.propertyId,
      roomId: args.roomId,
      tenantId: args.tenantId,
      startDate: args.startDate,
      endDate: args.endDate,
      monthlyRent: assertIdr(args.monthlyRent, "Harga sewa bulanan"),
      securityDeposit: assertIdr(args.securityDeposit, "Uang jaminan"),
      billingDay: args.billingDay,
      status: args.activate === false ? "draft" : "active",
      createdAt: now,
      updatedAt: now,
    });
    if (args.activate !== false) await ctx.db.patch(args.roomId, { status: "occupied", updatedAt: now });
    await writeAudit(ctx, {
      organizationId: args.organizationId,
      authUserId: user._id,
      action: "lease.created",
      entityType: "lease",
      entityId: leaseId,
    });
    return ctx.db.get(leaseId);
  },
});

export const end = mutation({
  args: { organizationId: v.id("organizations"), leaseId: v.id("leases"), endDate: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    const lease = await requireOwnedDocument(await ctx.db.get(args.leaseId), args.organizationId, "Sewa");
    if (lease.status === "ended") return lease;
    if (lease.status !== "active") throw new ConvexError("Hanya sewa aktif yang dapat diakhiri.");
    const now = Date.now();
    const endDate = assertTimestamp(args.endDate ?? now, "Tanggal selesai");
    if (endDate < lease.startDate || endDate > now) throw new ConvexError("Tanggal selesai harus berada antara tanggal mulai dan sekarang.");
    await requireOwnedDocument(await ctx.db.get(lease.roomId), args.organizationId, "Kamar");
    const activeLeases = await ctx.db.query("leases").withIndex("by_room_status", (q) => q.eq("roomId", lease.roomId).eq("status", "active")).collect();
    await ctx.db.patch(lease._id, { status: "ended", endDate, updatedAt: now });
    await ctx.db.patch(lease.roomId, { status: activeLeases.some((other) => other._id !== lease._id) ? "occupied" : "available", updatedAt: now });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "lease.ended", entityType: "lease", entityId: lease._id, metadata: { endDate } });
    return ctx.db.get(lease._id);
  },
});
