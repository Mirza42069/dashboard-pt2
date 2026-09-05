import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertText, makeToken, requireAuth } from "./domain";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const memberships = await ctx.db.query("memberships").withIndex("by_auth_user", (q) => q.eq("authUserId", user._id)).collect();
    const result = await Promise.all(memberships.filter((membership) => membership.status === "active").map(async (membership) => ({ organization: await ctx.db.get(membership.organizationId), membership })));
    return result.filter((item) => item.organization !== null);
  },
});

export const ensureCurrent = mutation({
  args: { name: v.optional(v.string()), createNew: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_auth_user", (q) => q.eq("authUserId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();

    if (existingMembership && !args.createNew) {
      const organization = await ctx.db.get(existingMembership.organizationId);
      if (organization) return { organization, membership: existingMembership };
    }

    const now = Date.now();
    const name = assertText(args.name ?? `Kos ${user.name}`, "Nama organisasi");
    const organizationId = await ctx.db.insert("organizations", {
      name,
      slug: makeToken("org"),
      timezone: "Asia/Jakarta",
      currency: "IDR",
      createdAt: now,
      updatedAt: now,
    });
    const membershipId = await ctx.db.insert("memberships", {
      organizationId,
      authUserId: user._id,
      role: "owner",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return {
      organization: await ctx.db.get(organizationId),
      membership: await ctx.db.get(membershipId),
    };
  },
});
