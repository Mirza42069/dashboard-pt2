import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireOrganization } from "./domain";

export const get = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    const [properties, rooms, tenants, invoices, expenses, maintenance] = await Promise.all([
      ctx.db.query("properties").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("rooms").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("tenants").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("invoices").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("expenses").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("maintenanceTickets").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
    ]);
    const now = new Date();
    const jakartaParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const year = Number(jakartaParts.find((part) => part.type === "year")?.value);
    const month = Number(jakartaParts.find((part) => part.type === "month")?.value);
    const startOfMonth = Date.UTC(year, month - 1, 1) - 7 * 60 * 60 * 1000;
    return {
      propertyCount: properties.filter((item) => item.isActive).length,
      roomCount: rooms.length,
      occupiedRoomCount: rooms.filter((item) => item.status === "occupied").length,
      activeTenantCount: tenants.filter((item) => item.status === "active").length,
      outstandingAmount: invoices.filter((item) => item.status === "pending" || item.status === "overdue").reduce((sum, item) => sum + item.total, 0),
      paidThisMonth: invoices.filter((item) => item.status === "paid" && (item.paidAt ?? 0) >= startOfMonth).reduce((sum, item) => sum + item.total, 0),
      expensesThisMonth: expenses.filter((item) => item.incurredAt >= startOfMonth).reduce((sum, item) => sum + item.amount, 0),
      openMaintenanceCount: maintenance.filter((item) => item.status === "open" || item.status === "in_progress").length,
    };
  },
});
