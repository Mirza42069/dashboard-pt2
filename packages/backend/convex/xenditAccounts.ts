import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertText, requireOrganization, writeAudit } from "./domain";

export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId, ["owner", "admin"]);
    return ctx.db.query("xenditAccounts").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).unique();
  },
});

export const update = mutation({
  args: {
    organizationId: v.id("organizations"),
    businessId: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    qrisEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireOrganization(ctx, args.organizationId, ["owner"]);
    const businessId = assertText(args.businessId, "ID bisnis Xendit");
    const existing = await ctx.db.query("xenditAccounts").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).unique();
    const now = Date.now();
    const requested = { requestedBusinessId: businessId, requestedStatus: args.status, requestedQrisEnabled: args.qrisEnabled, updatedAt: now };
    if (existing) {
      await ctx.db.patch(existing._id, requested);
      await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "xendit_account.configuration_requested", entityType: "xendit_account", entityId: existing._id });
      return ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert("xenditAccounts", { organizationId: args.organizationId, businessId: "", status: "inactive", qrisEnabled: false, ...requested, createdAt: now });
    await writeAudit(ctx, { organizationId: args.organizationId, authUserId: user._id, action: "xendit_account.created", entityType: "xendit_account", entityId: id });
    return ctx.db.get(id);
  },
});

// Deployment operators only: verify the legal organization/subaccount binding out of band.
// Possession of a business ID or access through the platform API is NOT ownership proof.
export const provision = internalMutation({
  args: { organizationId: v.id("organizations"), businessId: v.string(), qrisEnabled: v.boolean(), evidence: v.string() },
  handler: async (ctx, args) => {
    if (!await ctx.db.get(args.organizationId)) throw new ConvexError("Organisasi tidak ditemukan.");
    const businessId = assertText(args.businessId, "ID bisnis Xendit");
    const evidence = assertText(args.evidence, "Bukti verifikasi");
    const duplicate = await ctx.db.query("xenditAccounts").withIndex("by_business", (q) => q.eq("businessId", businessId)).unique();
    if (duplicate && duplicate.organizationId !== args.organizationId) throw new ConvexError("Akun bisnis sudah terikat.");
    const existing = await ctx.db.query("xenditAccounts").withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId)).unique();
    const now = Date.now();
    const fields = { businessId, status: "active" as const, qrisEnabled: args.qrisEnabled, verifiedAt: now, verificationEvidence: evidence, updatedAt: now };
    const id = existing?._id ?? await ctx.db.insert("xenditAccounts", { organizationId: args.organizationId, ...fields, createdAt: now });
    if (existing) await ctx.db.patch(id, fields);
    await writeAudit(ctx, { organizationId: args.organizationId, action: "xendit_account.provisioned", entityType: "xendit_account", entityId: id, metadata: { businessId, evidence } });
    return id;
  },
});
