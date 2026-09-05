import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertIdr, assertText, requireOrganization, requireOwnedDocument, writeAudit } from "./domain";
import { assertRoomOccupancy } from "./paymentRules";

const status = v.union(
  v.literal("available"),
  v.literal("occupied"),
  v.literal("maintenance"),
  v.literal("inactive"),
);

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    propertyId: v.optional(v.id("properties")),
    status: v.optional(status),
  },
  handler: async (ctx, args) => {
    await requireOrganization(ctx, args.organizationId);
    if (args.propertyId) {
      await requireOwnedDocument(await ctx.db.get(args.propertyId), args.organizationId, "Properti");
      const rooms = await ctx.db
        .query("rooms")
        .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId!))
        .collect();
      return args.status ? rooms.filter((room) => room.status === args.status) : rooms;
    }
    const rooms = await ctx.db
      .query("rooms")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();
    return args.status ? rooms.filter((room) => room.status === args.status) : rooms;
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomTypeId: v.optional(v.id("roomTypes")),
    number: v.string(),
    floor: v.optional(v.string()),
    monthlyRate: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    await requireOwnedDocument(await ctx.db.get(args.propertyId), args.organizationId, "Properti");
    if (args.roomTypeId) {
      const roomType = await ctx.db.get(args.roomTypeId);
      if (!roomType || roomType.organizationId !== args.organizationId || roomType.propertyId !== args.propertyId) {
        throw new ConvexError("Tipe kamar tidak ditemukan pada properti ini.");
      }
    }
    const number = assertText(args.number, "Nomor kamar");
    const duplicate = await ctx.db
      .query("rooms")
      .withIndex("by_property_number", (q) => q.eq("propertyId", args.propertyId).eq("number", number))
      .unique();
    if (duplicate) throw new ConvexError("Nomor kamar sudah digunakan pada properti ini.");

    const now = Date.now();
    const id = await ctx.db.insert("rooms", {
      organizationId: args.organizationId,
      propertyId: args.propertyId,
      roomTypeId: args.roomTypeId,
      number,
      floor: args.floor?.trim() || undefined,
      monthlyRate: assertIdr(args.monthlyRate, "Harga sewa bulanan"),
      status: "available",
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      organizationId: args.organizationId,
      authUserId: user._id,
      action: "room.created",
      entityType: "room",
      entityId: id,
    });
    return ctx.db.get(id);
  },
});

export const updateStatus = mutation({
  args: { organizationId: v.id("organizations"), roomId: v.id("rooms"), status },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin", "staff"]);
    await requireOwnedDocument(await ctx.db.get(args.roomId), args.organizationId, "Kamar");
    const activeLease = await ctx.db.query("leases").withIndex("by_room_status", (q) => q.eq("roomId", args.roomId).eq("status", "active")).first();
    assertRoomOccupancy(args.status, Boolean(activeLease));
    await ctx.db.patch(args.roomId, { status: args.status, updatedAt: Date.now() });
    await writeAudit(ctx, {
      organizationId: args.organizationId,
      authUserId: user._id,
      action: "room.status_updated",
      entityType: "room",
      entityId: args.roomId,
      metadata: { status: args.status },
    });
    return ctx.db.get(args.roomId);
  },
});
