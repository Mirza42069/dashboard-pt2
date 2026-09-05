import { ConvexError, v } from "convex/values";
import * as Effect from "effect/Effect";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { action, internalMutation, query, type ActionCtx } from "./_generated/server";
import { makeToken, requireAuth, requireOrganization, writeAudit } from "./domain";
import { assertQrisAmount, assertQrisDuration, requestDisposition } from "./paymentRules";
import { createQrisPaymentRequest } from "./xenditClient";

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId);
    return ctx.db.query("payments").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).order("desc").collect();
  },
});

const authority = v.union(
  v.object({ kind: v.literal("member"), organizationId: v.id("organizations"), invoiceId: v.id("invoices"), authUserId: v.string(), paymentLinkId: v.optional(v.id("paymentLinks")) }),
  v.object({ kind: v.literal("token"), token: v.string() }),
);

export const reserveQris = internalMutation({
  args: { authority, expiresInMinutes: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const minutes = assertQrisDuration(args.expiresInMinutes);
    const auth = args.authority;
    const link = auth.kind === "token"
      ? await ctx.db.query("paymentLinks").withIndex("by_token", (q) => q.eq("token", auth.token)).unique()
      : auth.paymentLinkId ? await ctx.db.get(auth.paymentLinkId) : null;
    if (auth.kind === "token" || auth.paymentLinkId) {
      if (!link || link.status !== "active" || (link.expiresAt !== undefined && link.expiresAt <= now)) throw new ConvexError("Pembayaran tidak tersedia.");
    }
    const organizationId = auth.kind === "member" ? auth.organizationId : link!.organizationId;
    const invoiceId = auth.kind === "member" ? auth.invoiceId : link!.invoiceId;
    if (auth.kind === "member") {
      const membership = await ctx.db.query("memberships").withIndex("by_organization_auth_user", (q) => q.eq("organizationId", organizationId).eq("authUserId", auth.authUserId)).unique();
      if (!membership || membership.status !== "active") throw new ConvexError("Akses organisasi tidak aktif.");
    }
    if (link && (link.organizationId !== organizationId || link.invoiceId !== invoiceId)) throw new ConvexError("Pembayaran tidak tersedia.");
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId || !["pending", "overdue"].includes(invoice.status)) throw new ConvexError("Tagihan tidak dapat dibayar.");
    assertQrisAmount(invoice.total);
    const account = await ctx.db.query("xenditAccounts").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).unique();
    if (!account?.verifiedAt || !account.businessId || account.status !== "active" || !account.qrisEnabled) throw new ConvexError("Akun QRIS belum diverifikasi dan diaktifkan.");
    const requests = await ctx.db.query("paymentRequests").withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId)).collect();
    // The index read and insert share one serializable transaction, including empty ranges.
    if (requests.some((r) => requestDisposition(r, now) === "blocked")) return { kind: "processing" as const };
    const pending = requests.find((r) => requestDisposition(r, now) === "reuse");
    if (pending) {
      if (pending.businessId !== account.businessId || pending.amount !== invoice.total) return { kind: "processing" as const };
      return { kind: "ready" as const, request: pending };
    }
    // All callers share these limits, so rotating links or identities cannot bypass them.
    const recent = requests.filter((r) => r.createdAt > now - 86_400_000);
    if (recent.length >= 12 || requests.some((r) => r.createdAt > now - 60_000)) return { kind: "rate_limited" as const };
    const limit = await ctx.db.query("paymentRateLimits").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).unique();
    const count = limit && limit.windowStart > now - 60_000 ? limit.count : 0;
    if (count >= 30) return { kind: "rate_limited" as const };
    if (limit) await ctx.db.patch(limit._id, { count: count + 1, windowStart: count ? limit.windowStart : now });
    else await ctx.db.insert("paymentRateLimits", { organizationId, count: 1, windowStart: now });
    const id = await ctx.db.insert("paymentRequests", {
      organizationId, invoiceId, paymentLinkId: link?._id, provider: "xendit", referenceId: makeToken("inv"),
      businessId: account.businessId, amount: invoice.total, currency: "IDR", status: "creating",
      expiresAt: now + minutes * 60_000, createdAt: now, updatedAt: now,
    });
    await writeAudit(ctx, { organizationId, authUserId: auth.kind === "member" ? auth.authUserId : undefined, action: "payment_request.reserved", entityType: "payment_request", entityId: id });
    return { kind: "reserved" as const, request: (await ctx.db.get(id))! };
  },
});

export const markUnknown = internalMutation({
  args: { requestId: v.id("paymentRequests") },
  handler: async (ctx, { requestId }) => {
    const request = await ctx.db.get(requestId);
    if (request?.status === "creating") await ctx.db.patch(requestId, { status: "unknown", updatedAt: Date.now() });
  },
});

export const listReconciliation = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await requireOrganization(ctx, organizationId, ["owner", "admin"]);
    const requests = await ctx.db.query("paymentRequests").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect();
    const result = [];
    for (const request of requests) {
      const events = request.providerPaymentRequestId ? await ctx.db.query("webhookEvents").withIndex("by_provider_request", (q) => q.eq("provider", "xendit").eq("providerPaymentRequestId", request.providerPaymentRequestId)).collect() : [];
      const failures = events.filter((event) => event.status === "failed").map((event) => ({ eventId: event.eventId, error: event.error, receivedAt: event.receivedAt }));
      if (request.status === "unknown" || request.status === "creating" || !request.businessId || failures.length) result.push({ request, failures });
    }
    return result;
  },
});

// Only an operator with authoritative Xendit evidence may release an uncertain request.
// A timeout, a 404 from a guessed ID, or local expiresAt is not sufficient evidence.
export const closeUncertain = internalMutation({
  args: { requestId: v.id("paymentRequests"), evidence: v.string(), confirmedNoCollectiblePayment: v.literal(true) },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || !["creating", "unknown"].includes(request.status)) throw new ConvexError("Permintaan tidak memerlukan pemulihan ini.");
    if (request.createdAt > Date.now() - 120_000 || !args.evidence.trim()) throw new ConvexError("Tunggu proses selesai dan sertakan bukti verifikasi Xendit.");
    const receipts = await ctx.db.query("payments").withIndex("by_invoice", (q) => q.eq("invoiceId", request.invoiceId)).collect();
    if (receipts.some((payment) => payment.paymentRequestId === request._id)) throw new ConvexError("Pembayaran sudah diterima.");
    await ctx.db.patch(request._id, { status: "failed", updatedAt: Date.now() });
    await writeAudit(ctx, { organizationId: request.organizationId, action: "payment_request.uncertainty_resolved", entityType: "payment_request", entityId: request._id, metadata: { evidence: args.evidence } });
  },
});

export const saveQrisRequest = internalMutation({
  args: { requestId: v.id("paymentRequests"), referenceId: v.string(), providerPaymentRequestId: v.string(), amount: v.number(), qrString: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request || request.referenceId !== args.referenceId || request.amount !== args.amount || !args.providerPaymentRequestId.trim() || !args.qrString.trim()) throw new ConvexError("Respons pembayaran tidak cocok.");
    if (!Number.isSafeInteger(args.expiresAt) || args.expiresAt <= request.createdAt || args.expiresAt > request.expiresAt) throw new ConvexError("Masa berlaku pembayaran tidak cocok.");
    if (request.providerPaymentRequestId && request.providerPaymentRequestId !== args.providerPaymentRequestId) throw new ConvexError("ID pembayaran tidak cocok.");
    const duplicate = await ctx.db.query("paymentRequests").withIndex("by_provider_request", (q) => q.eq("provider", "xendit").eq("providerPaymentRequestId", args.providerPaymentRequestId)).unique();
    if (duplicate && duplicate._id !== request._id) throw new ConvexError("ID pembayaran sudah digunakan.");
    await ctx.db.patch(request._id, {
      providerPaymentRequestId: args.providerPaymentRequestId, qrString: args.qrString, expiresAt: args.expiresAt,
      status: request.status === "creating" || request.status === "unknown" ? "pending" : request.status, updatedAt: Date.now(),
    });
    const earlyEvents = await ctx.db.query("webhookEvents").withIndex("by_provider_request", (q) => q.eq("provider", "xendit").eq("providerPaymentRequestId", args.providerPaymentRequestId)).collect();
    for (const event of earlyEvents.filter((e) => e.status === "ignored")) {
      await ctx.scheduler.runAfter(0, internal.webhooks.processXendit, {
        eventId: event.eventId, eventType: event.eventType, payloadJson: event.payloadJson,
        businessId: event.businessId, referenceId: event.referenceId, providerPaymentRequestId: event.providerPaymentRequestId,
        providerPaymentId: event.providerPaymentId, status: event.paymentStatus, amount: event.amount,
        currency: event.currency, method: event.method, paidAt: event.paidAt,
      });
    }
    return (await ctx.db.get(request._id))!;
  },
});

type Authority = { kind: "member"; organizationId: Id<"organizations">; invoiceId: Id<"invoices">; authUserId: string; paymentLinkId?: Id<"paymentLinks"> } | { kind: "token"; token: string };
type Reservation = { kind: "processing" | "rate_limited" } | { kind: "reserved" | "ready"; request: Doc<"paymentRequests"> };
export type QrisResult = { status: "ready"; qrString: string; amount: number; currency: "IDR"; expiresAt: number } | { status: "processing" | "rate_limited" | "unavailable" };

// Both public entry points use this path; token authority is never converted to a user identity.
export async function runQris(ctx: ActionCtx, authority: Authority, expiresInMinutes: number): Promise<QrisResult> {
  if (!process.env.XENDIT_SECRET_KEY) return { status: "unavailable" };
  const reservation: Reservation = await ctx.runMutation(internal.payments.reserveQris, { authority, expiresInMinutes });
  if (!("request" in reservation)) return { status: reservation.kind };
  let request = reservation.request;
  if (reservation.kind === "reserved") {
    try {
      const result = await Effect.runPromise(createQrisPaymentRequest({ secretKey: process.env.XENDIT_SECRET_KEY, businessId: request.businessId!, referenceId: request.referenceId, amount: request.amount, expiresAt: request.expiresAt }));
      request = await ctx.runMutation(internal.payments.saveQrisRequest, { requestId: request._id, referenceId: result.referenceId, providerPaymentRequestId: result.paymentRequestId, amount: result.amount, qrString: result.qrString, expiresAt: result.expiresAt });
    } catch {
      // Even a timeout, malformed response or failed persistence may follow a successful POST.
      // If this mutation also fails, the durable "creating" row still blocks another POST.
      await ctx.runMutation(internal.payments.markUnknown, { requestId: request._id });
      return { status: "processing" };
    }
  }
  if (request.status !== "pending" || request.expiresAt <= Date.now() || !request.qrString) return { status: "processing" };
  return { status: "ready", qrString: request.qrString, amount: request.amount, currency: "IDR", expiresAt: request.expiresAt };
}

export const createQris = action({
  args: { organizationId: v.id("organizations"), invoiceId: v.id("invoices"), paymentLinkId: v.optional(v.id("paymentLinks")), expiresInMinutes: v.optional(v.number()) },
  handler: async (ctx, args): Promise<QrisResult> => {
    const user = await requireAuth(ctx);
    return runQris(ctx, { kind: "member", organizationId: args.organizationId, invoiceId: args.invoiceId, paymentLinkId: args.paymentLinkId, authUserId: user._id }, args.expiresInMinutes ?? 30);
  },
});
