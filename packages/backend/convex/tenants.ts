import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertText, requireOrganization, writeAudit } from "./domain";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    return ctx.db.query("tenants").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    nik: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin", "staff"]);
    const now = Date.now();
    const id = await ctx.db.insert("tenants", {
      organizationId: args.organizationId,
      fullName: assertText(args.fullName, "Nama penyewa"),
      phone: args.phone?.trim() || undefined,
      email: args.email?.trim().toLowerCase() || undefined,
      nik: args.nik?.trim() || undefined,
      emergencyContact: args.emergencyContact?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      organizationId: args.organizationId,
      authUserId: user._id,
      action: "tenant.created",
      entityType: "tenant",
      entityId: id,
    });
    return ctx.db.get(id);
  },
});
