import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { paymentEventKind } from "./paymentRules";

export const processXendit = internalMutation({
  args: {
    eventId: v.string(), eventType: v.string(), payloadJson: v.string(),
    businessId: v.optional(v.string()), referenceId: v.optional(v.string()),
    providerPaymentRequestId: v.optional(v.string()), providerPaymentId: v.optional(v.string()),
    status: v.optional(v.string()), amount: v.optional(v.number()), currency: v.optional(v.string()),
    method: v.optional(v.string()), paidAt: v.optional(v.number()),
  },
  handler: async (ctx, incoming) => {
    const existing = await ctx.db.query("webhookEvents").withIndex("by_provider_event", (q) => q.eq("provider", "xendit").eq("eventId", incoming.eventId)).unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { deliveryCount: (existing.deliveryCount ?? 1) + 1 });
      if (existing.status !== "ignored") return { duplicate: true, status: existing.status };
    }
    // Replays use the originally authenticated payload, never replacement fields for an old ID.
    const args = existing ? {
      eventId: existing.eventId, eventType: existing.eventType, payloadJson: existing.payloadJson,
      businessId: existing.businessId, referenceId: existing.referenceId,
      providerPaymentRequestId: existing.providerPaymentRequestId, providerPaymentId: existing.providerPaymentId,
      status: existing.paymentStatus, amount: existing.amount, currency: existing.currency, method: existing.method, paidAt: existing.paidAt,
    } : incoming;
    const finish = async (status: "processed" | "ignored" | "failed", error?: string) => {
      if (existing) await ctx.db.patch(existing._id, { status, error, processedAt: now });
      else {
        const { status: paymentStatus, ...fields } = args;
        await ctx.db.insert("webhookEvents", { ...fields, paymentStatus, provider: "xendit", status, error, receivedAt: now, processedAt: now, deliveryCount: 1 });
      }
      return { duplicate: Boolean(existing), status };
    };
    const kind = paymentEventKind(args.eventType, args.status);
    if (!kind) return finish("ignored", "Jenis atau status event tidak didukung.");
    if (!args.providerPaymentRequestId?.trim()) return finish("failed", "ID permintaan pembayaran wajib diisi.");
    let request = await ctx.db.query("paymentRequests").withIndex("by_provider_request", (q) => q.eq("provider", "xendit").eq("providerPaymentRequestId", args.providerPaymentRequestId)).unique();
    if (!request && args.referenceId) request = await ctx.db.query("paymentRequests").withIndex("by_reference", (q) => q.eq("referenceId", args.referenceId!)).unique();
    if (!request) return finish("ignored", "Permintaan pembayaran tidak ditemukan.");
    if (!request.businessId || args.businessId !== request.businessId) return finish("failed", "Akun bisnis tidak cocok dengan snapshot.");
    if ((request.providerPaymentRequestId && request.providerPaymentRequestId !== args.providerPaymentRequestId) || (args.referenceId && args.referenceId !== request.referenceId)) return finish("failed", "Referensi pembayaran tidak cocok.");
    if (args.currency !== "IDR" || !Number.isSafeInteger(args.amount) || args.amount !== request.amount || request.amount <= 0 || request.amount > 10_000_000) return finish("failed", "Nominal atau mata uang tidak cocok.");
    if (args.method !== "QRIS") return finish("failed", "Metode pembayaran tidak cocok.");
    if (kind !== "expired" && !args.providerPaymentId?.trim()) return finish("failed", "ID pembayaran wajib diisi.");
    if (kind !== "succeeded") {
      // A failed payment attempt does not prove that its QR can no longer be paid.
      // Only a request-level expiry permits replacement of an unknown reservation.
      if (kind === "expired" && request.status !== "succeeded") await ctx.db.patch(request._id, { providerPaymentRequestId: args.providerPaymentRequestId, status: "expired", updatedAt: now });
      return finish("processed");
    }
    const invoice = await ctx.db.get(request.invoiceId);
    if (!invoice || invoice.organizationId !== request.organizationId) return finish("failed", "Tagihan tidak valid.");
    const providerPaymentId = args.providerPaymentId!;
    const payment = await ctx.db.query("payments").withIndex("by_provider_payment", (q) => q.eq("provider", "xendit").eq("providerPaymentId", providerPaymentId)).unique();
    if (payment && (payment.paymentRequestId !== request._id || payment.invoiceId !== invoice._id || payment.amount !== request.amount)) return finish("failed", "ID pembayaran sudah digunakan untuk permintaan lain.");
    if (payment) return finish("processed", "Pembayaran duplikat; tidak dibukukan ulang.");
    const paidAt = args.paidAt !== undefined && Number.isSafeInteger(args.paidAt) && args.paidAt > 0 && args.paidAt <= now + 300_000 ? args.paidAt : now;
    const needsReview = !["pending", "overdue"].includes(invoice.status) || invoice.total !== request.amount;
    await ctx.db.insert("payments", { organizationId: request.organizationId, invoiceId: invoice._id, paymentRequestId: request._id, provider: "xendit", providerPaymentId, amount: request.amount, method: "QRIS", status: "succeeded", paidAt, createdAt: now, updatedAt: now });
    await ctx.db.patch(request._id, { providerPaymentRequestId: args.providerPaymentRequestId, status: "succeeded", updatedAt: now });
    if (!needsReview) await ctx.db.patch(invoice._id, { status: "paid", paidAt, updatedAt: now });
    await ctx.db.insert("auditLogs", {
      organizationId: request.organizationId, action: needsReview ? "payment.reconciliation_required" : "payment.succeeded",
      entityType: "invoice", entityId: invoice._id,
      metadataJson: JSON.stringify({ providerPaymentId, amount: request.amount, invoiceStatus: invoice.status }), createdAt: now,
    });
    return finish(needsReview ? "failed" : "processed", needsReview ? "Dana diterima; tagihan tidak diubah. Rekonsiliasi atau pengembalian dana diperlukan." : undefined);
  },
});
