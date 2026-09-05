import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertText, requireOrganization, writeAudit } from "./domain";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    return ctx.db
      .query("properties")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin"]);
    const now = Date.now();
    const id = await ctx.db.insert("properties", {
      organizationId: args.organizationId,
      name: assertText(args.name, "Nama properti"),
      address: assertText(args.address, "Alamat"),
      city: assertText(args.city, "Kota"),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, {
      organizationId: args.organizationId,
      authUserId: user._id,
      action: "property.created",
      entityType: "property",
      entityId: id,
    });
    return ctx.db.get(id);
  },
});
