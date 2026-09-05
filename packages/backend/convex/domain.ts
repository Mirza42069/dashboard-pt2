import type { GenericCtx } from "@convex-dev/better-auth";
import { ConvexError } from "convex/values";
import type { DataModel, Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { authComponent } from "./auth";

export type OrganizationRole = "owner" | "admin" | "staff";
type DatabaseCtx = QueryCtx | MutationCtx;

export async function requireAuth(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) {
    throw new ConvexError("Anda harus masuk untuk melanjutkan.");
  }
  return user;
}

export async function requireOrganization(
  ctx: DatabaseCtx,
  organizationId: Id<"organizations">,
  allowedRoles?: readonly OrganizationRole[],
) {
  const user = await requireAuth(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_organization_auth_user", (q) =>
      q.eq("organizationId", organizationId).eq("authUserId", user._id),
    )
    .unique();

  if (!membership || membership.status !== "active") {
    throw new ConvexError("Anda tidak memiliki akses ke organisasi ini.");
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new ConvexError("Peran Anda tidak memiliki izin untuk tindakan ini.");
  }
  return { user, membership };
}

export function assertText(value: string, label: string) {
  const text = value.trim();
  if (!text) throw new ConvexError(`${label} wajib diisi.`);
  return text;
}

export function assertIdr(value: number, label = "Nominal") {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ConvexError(`${label} harus berupa rupiah bulat yang tidak negatif.`);
  }
  return value;
}

export function assertTimestamp(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ConvexError(`${label} tidak valid.`);
  }
  return value;
}

export function makeToken(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function makeInvoiceNumber(now: number) {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `INV-${year}${month}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function requireOwnedDocument<T extends Doc<"properties"> | Doc<"rooms"> | Doc<"tenants"> | Doc<"leases"> | Doc<"invoices">>(
  doc: T | null,
  organizationId: Id<"organizations">,
  label: string,
): Promise<T> {
  if (!doc || doc.organizationId !== organizationId) {
    throw new ConvexError(`${label} tidak ditemukan.`);
  }
  return doc;
}

export async function writeAudit(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    authUserId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: unknown;
  },
) {
  await ctx.db.insert("auditLogs", {
    organizationId: args.organizationId,
    authUserId: args.authUserId,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId,
    metadataJson: args.metadata === undefined ? undefined : JSON.stringify(args.metadata),
    createdAt: Date.now(),
  });
}
