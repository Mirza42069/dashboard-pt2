import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { authComponent } from "../convex/auth";
import { assertQrisAmount, assertQrisDuration, assertRoomOccupancy, parsePaymentNotification, paymentEventKind, requestDisposition } from "../convex/paymentRules";
import { assertIdr, assertTimestamp } from "../convex/domain";
import * as accounts from "../convex/xenditAccounts";
import * as payments from "../convex/payments";
import * as publicPayments from "../convex/publicPayments";
import * as webhooks from "../convex/webhooks";
import * as rooms from "../convex/rooms";
import * as leases from "../convex/leases";
import * as organizations from "../convex/organizations";
import { getFunctionName } from "convex/server";

// Handler-level test double, NOT a replacement for Convex OCC/deployment tests.
// Transactions are serialized and rolled back on error, as mutations require.
function fixture() {
  let rows = new Map();
  let sequence = 0;
  let queue = Promise.resolve();
  const scheduled = [];
  const db = {
    get: async (id) => structuredClone(rows.get(id) ?? null),
    insert: async (table, fields) => {
      const id = `${table}:${++sequence}`;
      rows.set(id, { ...structuredClone(fields), _id: id, _creationTime: Date.now(), _table: table });
      return id;
    },
    patch: async (id, fields) => { rows.set(id, { ...rows.get(id), ...structuredClone(fields) }); },
    query: (table) => {
      const equalities = [];
      const index = { eq: (key, value) => { equalities.push([key, value]); return index; } };
      let descending = false;
      const collect = async () => {
        const result = [...rows.values()].filter((r) => r._table === table && equalities.every(([key, value]) => r[key] === value));
        return structuredClone(descending ? result.reverse() : result);
      };
      const query = {
        filter: (fn) => { fn({ field: (key) => key, eq: (key, value) => equalities.push([key, value]) }); return query; },
        withIndex: (_name, fn) => { fn(index); return query; },
        order: (direction) => { descending = direction === "desc"; return query; },
        collect,
        first: async () => (await collect())[0] ?? null,
        unique: async () => { const all = await collect(); if (all.length > 1) throw Error("non-unique"); return all[0] ?? null; },
      };
      return query;
    },
  };
  const ctx = { db, scheduler: { runAfter: async (...args) => scheduled.push(args) } };
  const call = (fn, args) => {
    const result = queue.then(async () => {
      const before = structuredClone(rows);
      try { return await fn._handler(ctx, args); } catch (error) { rows = before; throw error; }
    });
    queue = result.catch(() => {});
    return result;
  };
  const actionCtx = { runMutation: (reference, args) => call(payments[getFunctionName(reference).split(":")[1]], args) };
  return { db, ctx, call, actionCtx, scheduled, all: (table) => db.query(table).collect() };
}

async function setup({ verified = true, invoiceStatus = "pending" } = {}) {
  const f = fixture();
  spyOn(authComponent, "safeGetAuthUser").mockResolvedValue({ _id: "owner", name: "Owner" });
  const org = await f.db.insert("organizations", { name: "Org" });
  const otherOrg = await f.db.insert("organizations", { name: "Other" });
  await f.db.insert("memberships", { organizationId: org, authUserId: "owner", role: "owner", status: "active" });
  const room = await f.db.insert("rooms", { organizationId: org, status: "occupied" });
  const lease = await f.db.insert("leases", { organizationId: org, roomId: room, status: "active", startDate: Date.now() - 86_400_000 });
  const invoice = await f.db.insert("invoices", { organizationId: org, roomId: room, leaseId: lease, total: 1_500_000, status: invoiceStatus });
  const account = await f.db.insert("xenditAccounts", { organizationId: org, businessId: "biz-owned", status: "active", qrisEnabled: true, verifiedAt: verified ? Date.now() : undefined });
  const token = `pay_${"a".repeat(32)}`;
  const link = await f.db.insert("paymentLinks", { organizationId: org, invoiceId: invoice, token, status: "active" });
  const authority = { kind: "member", organizationId: org, invoiceId: invoice, authUserId: "owner" };
  return { ...f, org, otherOrg, room, lease, invoice, account, token, link, authority };
}

const spies = [];
const oldKey = process.env.XENDIT_SECRET_KEY;
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  authComponent.safeGetAuthUser.mockRestore?.();
  if (oldKey === undefined) delete process.env.XENDIT_SECRET_KEY;
  else process.env.XENDIT_SECRET_KEY = oldKey;
});

describe("validation", () => {
  test("parses documented v3 captures and rejects partial, ambiguous or forged amounts", () => {
    const payload = { event: "payment.capture", business_id: "biz", data: { business_id: "biz", request_amount: "1500000", payment_id: "py-real", payment_request_id: "pr-real", captures: [{ capture_amount: "1500000", capture_timestamp: "2026-01-01T00:00:00Z" }] } };
    expect(parsePaymentNotification(payload).amount).toBe(1_500_000);
    expect(parsePaymentNotification(payload).providerPaymentId).toBe("py-real");
    expect(parsePaymentNotification({ ...payload, data: { ...payload.data, captures: [] } }).amount).toBeUndefined();
    expect(parsePaymentNotification({ ...payload, data: { ...payload.data, captures: [{ capture_amount: 1 }] } }).amount).toBeUndefined();
    expect(parsePaymentNotification({ ...payload, data: { ...payload.data, captures: [...payload.data.captures, ...payload.data.captures] } }).amount).toBeUndefined();
    expect(parsePaymentNotification({ ...payload, data: { ...payload.data, business_id: "foreign" } }).businessId).toBeUndefined();
    expect(parsePaymentNotification({ ...payload, data: { id: "not-a-payment-id" } }).providerPaymentId).toBeUndefined();
  });
  test("integer IDR and QRIS ceiling", () => {
    for (const amount of [NaN, Infinity, -1, 0, 1.5, 10_000_001, Number.MAX_SAFE_INTEGER]) expect(() => assertQrisAmount(amount)).toThrow();
    expect(assertQrisAmount(1)).toBe(1);
    expect(assertQrisAmount(10_000_000)).toBe(10_000_000);
    expect(assertIdr(0)).toBe(0);
    expect(() => assertIdr(1.1)).toThrow();
    expect(() => assertTimestamp(Infinity, "date")).toThrow();
  });
  test("duration, event whitelist and occupancy", () => {
    for (const duration of [NaN, 4, 1441, 5.5]) expect(() => assertQrisDuration(duration)).toThrow();
    expect(assertQrisDuration(5)).toBe(5);
    expect(paymentEventKind("refund.succeeded", "SUCCEEDED")).toBeNull();
    expect(paymentEventKind("payment.capture", "CAPTURED")).toBeNull();
    expect(paymentEventKind("payment.capture", "SUCCEEDED")).toBe("succeeded");
    expect(() => assertRoomOccupancy("available", true)).toThrow();
    expect(() => assertRoomOccupancy("occupied", false)).toThrow();
  });
  test("uncertain reservations never expire into a blind retry", () => {
    for (const status of ["creating", "unknown", "succeeded"]) expect(requestDisposition({ status, expiresAt: 1 }, Date.now())).toBe("blocked");
    expect(requestDisposition({ status: "pending", expiresAt: Date.now() + 1000 }, Date.now())).toBe("blocked");
  });
});

describe("routing authority", () => {
  test("owner can create a second org and list only active memberships", async () => {
    const f = await setup();
    const second = await f.call(organizations.ensureCurrent, { name: "Second", createNew: true });
    expect(second.organization._id).not.toBe(f.org);
    expect(second.membership.role).toBe("owner");
    const list = await organizations.list._handler(f.ctx, {});
    expect(list.map((item) => item.organization._id)).toEqual([f.org, second.organization._id]);
  });
  test("owner can request another business but cannot activate or change routing", async () => {
    const f = await setup();
    await f.call(accounts.update, { organizationId: f.org, businessId: "victim", status: "active", qrisEnabled: true });
    const account = await f.db.get(f.account);
    expect(account.businessId).toBe("biz-owned");
    expect(account.requestedBusinessId).toBe("victim");
    await expect(f.call(accounts.update, { organizationId: f.otherOrg, businessId: "victim", status: "active", qrisEnabled: true })).rejects.toThrow();
  });
  test("new configuration stays inactive; provisioning is internal and unique", async () => {
    const f = await setup();
    await f.db.insert("memberships", { organizationId: f.otherOrg, authUserId: "owner", role: "owner", status: "active" });
    const requested = await f.call(accounts.update, { organizationId: f.otherOrg, businessId: "victim", status: "active", qrisEnabled: true });
    expect(requested.businessId).toBe("");
    expect(requested.status).toBe("inactive");
    expect(requested.qrisEnabled).toBe(false);
    expect(accounts.provision.isInternal).toBe(true);
    await expect(f.call(accounts.provision, { organizationId: f.otherOrg, businessId: "biz-owned", qrisEnabled: true, evidence: "operator-ticket" })).rejects.toThrow();
  });
  test("legacy self-authorized active accounts fail closed", async () => {
    const f = await setup({ verified: false });
    await expect(f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 })).rejects.toThrow();
    expect(await f.all("paymentRequests")).toHaveLength(0);
  });
});

describe("reservations and public token authorization", () => {
  test("successful POST uses snapshot routing and exposes only QR display fields", async () => {
    const f = await setup();
    process.env.XENDIT_SECRET_KEY = "test-only";
    const fetch = spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const posted = new Request(input, init);
      const body = await posted.json();
      expect(posted.headers.get("for-user-id")).toBe("biz-owned");
      expect(body.request_amount).toBe(1_500_000);
      expect((await f.all("paymentRequests"))[0].status).toBe("creating");
      return Response.json({ payment_request_id: "pr-real", reference_id: body.reference_id, business_id: "biz-owned", type: "PAY", channel_code: "QRIS", currency: "IDR", request_amount: "1500000", status: "REQUIRES_ACTION", channel_properties: body.channel_properties, actions: [{ type: "PRESENT_TO_CUSTOMER", descriptor: "QR_STRING", value: "QR-REAL" }] }, { status: 201 });
    });
    spies.push(fetch);
    const result = await publicPayments.createQris._handler(f.actionCtx, { token: f.token });
    expect(result).toEqual({ status: "ready", qrString: "QR-REAL", amount: 1_500_000, currency: "IDR", expiresAt: expect.any(Number) });
    expect(await payments.runQris(f.actionCtx, f.authority, 30)).toEqual(result);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  test("malformed success cannot create a reusable QR or authorize a retry", async () => {
    const f = await setup();
    process.env.XENDIT_SECRET_KEY = "test-only";
    const fetch = spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ payment_request_id: "pr-real", request_amount: 1 }));
    spies.push(fetch);
    expect(await payments.runQris(f.actionCtx, f.authority, 30)).toEqual({ status: "processing" });
    expect((await f.all("paymentRequests"))[0].status).toBe("unknown");
    expect(await payments.runQris(f.actionCtx, f.authority, 30)).toEqual({ status: "processing" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  test("uncertain requests require internal evidence-based closure", async () => {
    const f = await setup();
    const { request } = await f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 });
    expect(payments.closeUncertain.isInternal).toBe(true);
    await expect(f.call(payments.closeUncertain, { requestId: request._id, evidence: "provider-ticket", confirmedNoCollectiblePayment: true })).rejects.toThrow();
    await f.db.patch(request._id, { createdAt: Date.now() - 180_000 });
    await f.call(payments.closeUncertain, { requestId: request._id, evidence: "provider-confirmed-no-request-ticket", confirmedNoCollectiblePayment: true });
    expect((await f.db.get(request._id)).status).toBe("failed");
    expect((await f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 })).kind).toBe("reserved");
  });
  test("simultaneous member and token reservations create one durable row", async () => {
    const f = await setup();
    const results = await Promise.all([f.authority, { kind: "token", token: f.token }, f.authority].map((authority) => f.call(payments.reserveQris, { authority, expiresInMinutes: 30 })));
    expect(results.map((r) => r.kind)).toEqual(["reserved", "processing", "processing"]);
    expect(await f.all("paymentRequests")).toHaveLength(1);
    expect(results[0].request.businessId).toBe("biz-owned");
  });
  test("rejects foreign invoices, revoked/expired links and oversized QR", async () => {
    const f = await setup();
    await expect(f.call(payments.reserveQris, { authority: { ...f.authority, organizationId: f.otherOrg }, expiresInMinutes: 30 })).rejects.toThrow();
    await f.db.patch(f.link, { expiresAt: Date.now() - 1 });
    await expect(f.call(payments.reserveQris, { authority: { kind: "token", token: f.token }, expiresInMinutes: 30 })).rejects.toThrow();
    await f.db.patch(f.link, { expiresAt: undefined, status: "revoked" });
    await expect(f.call(payments.reserveQris, { authority: { kind: "token", token: f.token }, expiresInMinutes: 30 })).rejects.toThrow();
    await f.db.patch(f.invoice, { total: 10_000_001 });
    await expect(f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 })).rejects.toThrow();
  });
  test("reuses ready QR and token can replace expired QR", async () => {
    const f = await setup();
    const first = await f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 });
    await f.call(payments.saveQrisRequest, { requestId: first.request._id, referenceId: first.request.referenceId, providerPaymentRequestId: "pr-1", amount: first.request.amount, qrString: "QR", expiresAt: first.request.expiresAt });
    const ready = await f.call(payments.reserveQris, { authority: { kind: "token", token: f.token }, expiresInMinutes: 30 });
    expect(ready.kind).toBe("ready");
    expect(ready.request._id).toBe(first.request._id);
    await f.db.patch(first.request._id, { expiresAt: Date.now() - 1, createdAt: Date.now() - 120_000 });
    const refreshed = await f.call(payments.reserveQris, { authority: { kind: "token", token: f.token }, expiresInMinutes: 30 });
    expect(refreshed.kind).toBe("reserved");
    expect(refreshed.request._id).not.toBe(first.request._id);
  });
  test("limits survive token rotation and are shared across the organization", async () => {
    const f = await setup();
    await f.db.insert("paymentRateLimits", { organizationId: f.org, count: 30, windowStart: Date.now() });
    expect((await f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 })).kind).toBe("rate_limited");
    expect(await f.all("paymentRequests")).toHaveLength(0);
  });
  test("transport failure remains unknown; repeated action never posts again", async () => {
    const f = await setup();
    process.env.XENDIT_SECRET_KEY = "test-only";
    const fetch = spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection lost"));
    spies.push(fetch);
    expect(await payments.runQris(f.actionCtx, f.authority, 30)).toEqual({ status: "processing" });
    expect(await payments.runQris(f.actionCtx, { kind: "token", token: f.token }, 30)).toEqual({ status: "processing" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await f.all("paymentRequests"))[0].status).toBe("unknown");
  });
  test("Effect timeout aborts a stalled provider call and preserves uncertainty", async () => {
    const f = await setup();
    process.env.XENDIT_SECRET_KEY = "test-only";
    let aborted = false;
    const fetch = spyOn(globalThis, "fetch").mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => { aborted = true; reject(new DOMException("Aborted", "AbortError")); });
    }));
    spies.push(fetch);
    expect(await payments.runQris(f.actionCtx, f.authority, 30)).toEqual({ status: "processing" });
    expect(aborted).toBe(true);
    expect((await f.all("paymentRequests"))[0].status).toBe("unknown");
    expect(await payments.runQris(f.actionCtx, f.authority, 30)).toEqual({ status: "processing" });
    expect(fetch).toHaveBeenCalledTimes(1);
  }, 30_000);
  test("public action returns generic errors with no routing or identity information", async () => {
    const f = await setup();
    process.env.XENDIT_SECRET_KEY = "test-only";
    expect(await publicPayments.createQris._handler(f.actionCtx, { token: `pay_${"b".repeat(32)}` })).toEqual({ status: "unavailable" });
  });
});

async function webhookFixture(options) {
  const f = await setup(options);
  // Reserve before changing invoice status for exceptional receipt tests.
  await f.db.patch(f.invoice, { status: "pending" });
  const { request } = await f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 });
  if (options?.invoiceStatus) await f.db.patch(f.invoice, { status: options.invoiceStatus });
  const event = { eventId: "evt-1", eventType: "payment.capture", payloadJson: "{}", businessId: request.businessId, referenceId: request.referenceId, providerPaymentRequestId: "pr-1", providerPaymentId: "py-1", status: "SUCCEEDED", amount: request.amount, currency: "IDR", method: "QRIS" };
  return { ...f, request, event };
}

describe("webhook reconciliation", () => {
  test("early capture resolves a reservation, using its snapshot after account changes", async () => {
    const f = await webhookFixture();
    await f.db.patch(f.account, { businessId: "new-business" });
    expect((await f.call(webhooks.processXendit, f.event)).status).toBe("processed");
    expect((await f.db.get(f.invoice)).status).toBe("paid");
    expect((await f.db.get(f.request._id)).providerPaymentRequestId).toBe("pr-1");
    await f.call(payments.saveQrisRequest, { requestId: f.request._id, referenceId: f.request.referenceId, providerPaymentRequestId: "pr-1", amount: f.request.amount, qrString: "QR", expiresAt: f.request.expiresAt });
    expect((await f.db.get(f.request._id)).status).toBe("succeeded");
  });
  test("rejects unrelated events, wrong business, payment ID, amount, currency and channel", async () => {
    for (const override of [{ eventType: "refund.succeeded" }, { businessId: undefined }, { businessId: "other" }, { providerPaymentId: undefined }, { amount: 1 }, { amount: 1.5 }, { currency: "USD" }, { method: "CARD" }]) {
      const f = await webhookFixture();
      await f.call(webhooks.processXendit, { ...f.event, ...override });
      expect((await f.db.get(f.invoice)).status).toBe("pending");
      expect(await f.all("payments")).toHaveLength(0);
    }
  });
  test("duplicate delivery and payment IDs do not double book; extra money is reconciled", async () => {
    const f = await webhookFixture();
    await f.call(webhooks.processXendit, f.event);
    await f.call(webhooks.processXendit, f.event);
    await f.call(webhooks.processXendit, { ...f.event, eventId: "evt-2" });
    expect(await f.all("payments")).toHaveLength(1);
    expect((await f.all("webhookEvents"))[0].deliveryCount).toBe(2);
    await f.call(webhooks.processXendit, { ...f.event, eventId: "evt-3", providerPaymentId: "py-2" });
    expect(await f.all("payments")).toHaveLength(2);
    expect((await f.all("webhookEvents"))[2].status).toBe("failed");
    expect((await f.all("auditLogs")).some((r) => r.action === "payment.reconciliation_required")).toBe(true);
  });
  test("void invoices retain status while real received funds are recorded", async () => {
    const f = await webhookFixture({ invoiceStatus: "void" });
    expect((await f.call(webhooks.processXendit, f.event)).status).toBe("failed");
    expect((await f.db.get(f.invoice)).status).toBe("void");
    expect(await f.all("payments")).toHaveLength(1);
  });
  test("a payment failure does not authorize another POST", async () => {
    const f = await webhookFixture();
    await f.call(webhooks.processXendit, { ...f.event, eventType: "payment.failure", status: "FAILED" });
    expect((await f.db.get(f.request._id)).status).toBe("creating");
    expect((await f.call(payments.reserveQris, { authority: f.authority, expiresInMinutes: 30 })).kind).toBe("processing");
  });
  test("event ID collision cannot replace originally received fields", async () => {
    const f = await webhookFixture();
    await f.call(webhooks.processXendit, { ...f.event, eventType: "refund.succeeded" });
    await f.call(webhooks.processXendit, f.event);
    expect(await f.all("payments")).toHaveLength(0);
  });
});

describe("lease occupancy", () => {
  test("room status cannot bypass active lease; ending releases it atomically", async () => {
    const f = await setup();
    await expect(f.call(rooms.updateStatus, { organizationId: f.org, roomId: f.room, status: "available" })).rejects.toThrow();
    expect((await f.db.get(f.room)).status).toBe("occupied");
    await f.call(leases.end, { organizationId: f.org, leaseId: f.lease });
    expect((await f.db.get(f.lease)).status).toBe("ended");
    expect((await f.db.get(f.room)).status).toBe("available");
    await f.call(leases.end, { organizationId: f.org, leaseId: f.lease });
    await expect(f.call(rooms.updateStatus, { organizationId: f.org, roomId: f.room, status: "occupied" })).rejects.toThrow();
  });
  test("foreign and future lease endings are rejected", async () => {
    const f = await setup();
    await expect(f.call(leases.end, { organizationId: f.otherOrg, leaseId: f.lease })).rejects.toThrow();
    await expect(f.call(leases.end, { organizationId: f.org, leaseId: f.lease, endDate: Date.now() + 60_000 })).rejects.toThrow();
    expect((await f.db.get(f.room)).status).toBe("occupied");
  });
});
