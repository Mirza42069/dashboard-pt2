import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertIdr, assertText, assertTimestamp, requireOrganization, requireOwnedDocument, writeAudit } from "./domain";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    return ctx.db.query("expenses").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).order("desc").collect();
  },
});

export const create = mutation({
  args: {
    organizationId: v.id("organizations"),
    propertyId: v.optional(v.id("properties")),
    category: v.string(),
    description: v.string(),
    amount: v.number(),
    vendor: v.optional(v.string()),
    incurredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner", "admin", "staff"]);
    if (args.propertyId) await requireOwnedDocument(await ctx.db.get(args.propertyId), args.organizationId, "Properti");
    const now = Date.now();
    const id = await ctx.db.insert("expenses", {
      organizationId: args.organizationId,
      propertyId: args.propertyId,
      category: assertText(args.category, "Kategori"),
      description: assertText(args.description, "Keterangan"),
      amount: assertIdr(args.amount),
      vendor: args.vendor?.trim() || undefined,
      incurredAt: assertTimestamp(args.incurredAt, "Tanggal pengeluaran"),
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "expense.created", entityType: "expense", entityId: id });
    return ctx.db.get(id);
  },
});
