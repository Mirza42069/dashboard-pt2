import { ConvexError } from "convex/values";

export function assertQrisAmount(amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 10_000_000) {
    throw new ConvexError("Nominal QRIS harus antara Rp1 dan Rp10.000.000, dalam rupiah bulat.");
  }
  return amount;
}

export function assertQrisDuration(minutes: number) {
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 1440) {
    throw new ConvexError("Masa berlaku QRIS harus antara 5 menit dan 24 jam.");
  }
  return minutes;
}

export function requestDisposition(request: { status: string; expiresAt: number; businessId?: string; qrString?: string }, now: number) {
  if (request.status === "creating" || request.status === "unknown") return "blocked";
  if (request.status === "succeeded") return "blocked";
  if (request.status === "pending" && request.expiresAt > now) {
    return request.businessId && request.qrString ? "reuse" : "blocked";
  }
  return "replace";
}

export function paymentEventKind(eventType: string, status?: string) {
  if (eventType === "payment.capture" && status === "SUCCEEDED") return "succeeded";
  if (eventType === "payment.failure" && status === "FAILED") return "failed";
  if (eventType === "payment_request.expiry" && status === "EXPIRED") return "expired";
  return null;
}

export function assertRoomOccupancy(status: string, hasActiveLease: boolean) {
  if ((status === "occupied") !== hasActiveLease) {
    throw new ConvexError("Status hunian harus sesuai dengan sewa aktif. Akhiri sewa untuk melepas kamar.");
  }
}

export function parsePaymentNotification(payload: Record<string, unknown>) {
  const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
  const amount = (value: unknown) => {
    const parsed = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
    return typeof parsed === "number" && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  };
  const data = isRecord(payload.data) ? payload.data : {};
  const eventType = text(payload.event) ?? "unknown";
  const capture = Array.isArray(data.captures) && data.captures.length === 1 && isRecord(data.captures[0]) ? data.captures[0] : undefined;
  const requestedAmount = amount(data.request_amount);
  const capturedAmount = amount(capture?.capture_amount);
  const businessId = text(payload.business_id);
  const dataBusinessId = text(data.business_id);
  const paidAt = Date.parse(text(capture?.capture_timestamp) ?? "");
  return {
    eventType,
    businessId: businessId && dataBusinessId && businessId !== dataBusinessId ? undefined : businessId ?? dataBusinessId,
    referenceId: text(data.reference_id),
    providerPaymentRequestId: text(data.payment_request_id),
    providerPaymentId: text(data.payment_id),
    status: text(data.status),
    // Dynamic QRIS is one full automatic capture, not an authorization or partial capture.
    amount: eventType === "payment.capture" ? capturedAmount === requestedAmount ? capturedAmount : undefined : requestedAmount,
    currency: text(data.currency),
    method: text(data.channel_code),
    paidAt: Number.isFinite(paidAt) ? paidAt : undefined,
  };
}
