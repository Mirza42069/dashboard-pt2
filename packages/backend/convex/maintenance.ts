import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertText, requireOrganization, requireOwnedDocument, writeAudit } from "./domain";

const ticketStatus = v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed"));
const priority = v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent"));

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    return ctx.db.query("maintenanceTickets").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).order("desc").collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomId: v.optional(v.id("rooms")),
    tenantId: v.optional(v.id("tenants")),
    title: v.string(),
    description: v.string(),
    priority,
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin", "staff"]);
    await requireOwnedDocument(await ctx.db.get(args.propertyId), args.organizationId, "Properti");
    if (args.roomId) {
      const room = await requireOwnedDocument(await ctx.db.get(args.roomId), args.organizationId, "Kamar");
      if (room.propertyId !== args.propertyId) throw new ConvexError("Kamar tidak berada di properti yang dipilih.");
    }
    if (args.tenantId) await requireOwnedDocument(await ctx.db.get(args.tenantId), args.organizationId, "Penyewa");
    const now = Date.now();
    const id = await ctx.db.insert("maintenanceTickets", {
      organizationId: args.organizationId,
      propertyId: args.propertyId,
      roomId: args.roomId,
      tenantId: args.tenantId,
      title: assertText(args.title, "Judul tiket"),
      description: assertText(args.description, "Deskripsi tiket"),
      priority: args.priority,
      status: "open",
      reportedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "maintenance.created", entityType: "maintenance", entityId: id });
    return ctx.db.get(id);
  },
});

export const updateStatus = mutation({
  args: { organizationId: v.id("organizations"), ticketId: v.id("maintenanceTickets"), status: ticketStatus },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin", "staff"]);
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket || ticket.organizationId !== args.organizationId) throw new ConvexError("Tiket pemeliharaan tidak ditemukan.");
    const now = Date.now();
    await ctx.db.patch(args.ticketId, {
      status: args.status,
      resolvedAt: args.status === "resolved" || args.status === "closed" ? ticket.resolvedAt ?? now : undefined,
      updatedAt: now,
    });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "maintenance.status_updated", entityType: "maintenance", entityId: args.ticketId, metadata: { status: args.status } });
    return ctx.db.get(args.ticketId);
  },
});
