import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const role = v.union(v.literal("owner"), v.literal("admin"), v.literal("staff"));
const roomStatus = v.union(
  v.literal("available"),
  v.literal("occupied"),
  v.literal("maintenance"),
  v.literal("inactive"),
);
const invoiceStatus = v.union(
  v.literal("draft"),
  v.literal("pending"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("void"),
);

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    timezone: v.string(),
    currency: v.literal("IDR"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  memberships: defineTable({
    organizationId: v.id("organizations"),
    authUserId: v.string(),
    role,
    status: v.union(v.literal("active"), v.literal("invited"), v.literal("disabled")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_auth_user", ["authUserId"])
    .index("by_organization", ["organizationId"])
    .index("by_organization_auth_user", ["organizationId", "authUserId"]),

  properties: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    address: v.string(),
    city: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_active", ["organizationId", "isActive"]),

  roomTypes: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    name: v.string(),
    monthlyRate: v.number(),
    capacity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_property", ["propertyId"]),

  rooms: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomTypeId: v.optional(v.id("roomTypes")),
    number: v.string(),
    floor: v.optional(v.string()),
    monthlyRate: v.number(),
    status: roomStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_property", ["propertyId"])
    .index("by_property_number", ["propertyId", "number"]),

  tenants: defineTable({
    organizationId: v.id("organizations"),
    fullName: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    nik: v.optional(v.string()),
    emergencyContact: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"]),

  leases: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    tenantId: v.id("tenants"),
    startDate: v.number(),
    endDate: v.optional(v.number()),
    monthlyRent: v.number(),
    securityDeposit: v.number(),
    billingDay: v.number(),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("ended")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_room_status", ["roomId", "status"])
    .index("by_tenant", ["tenantId"]),

  invoices: defineTable({
    organizationId: v.id("organizations"),
    leaseId: v.id("leases"),
    tenantId: v.id("tenants"),
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    number: v.string(),
    period: v.string(),
    issuedAt: v.number(),
    dueAt: v.number(),
    subtotal: v.number(),
    total: v.number(),
    status: invoiceStatus,
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_organization_period", ["organizationId", "period"])
    .index("by_lease_period", ["leaseId", "period"])
    .index("by_number", ["number"]),

  invoiceItems: defineTable({
    organizationId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    description: v.string(),
    quantity: v.number(),
    unitAmount: v.number(),
    amount: v.number(),
    createdAt: v.number(),
  }).index("by_invoice", ["invoiceId"]),

  paymentLinks: defineTable({
    organizationId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    token: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_organization_invoice", ["organizationId", "invoiceId"]),

  paymentRequests: defineTable({
    organizationId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    paymentLinkId: v.optional(v.id("paymentLinks")),
    provider: v.literal("xendit"),
    referenceId: v.string(),
    providerPaymentRequestId: v.optional(v.string()),
    businessId: v.optional(v.string()),
    amount: v.number(),
    currency: v.literal("IDR"),
    status: v.union(
      v.literal("creating"),
      v.literal("unknown"),
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("expired"),
    ),
    qrString: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_reference", ["referenceId"])
    .index("by_provider_request", ["provider", "providerPaymentRequestId"]),

  payments: defineTable({
    organizationId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    paymentRequestId: v.optional(v.id("paymentRequests")),
    provider: v.literal("xendit"),
    providerPaymentId: v.string(),
    amount: v.number(),
    method: v.string(),
    status: v.union(v.literal("succeeded"), v.literal("failed"), v.literal("refunded")),
    paidAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_provider_payment", ["provider", "providerPaymentId"]),

  meterReadings: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    type: v.union(v.literal("electricity"), v.literal("water")),
    period: v.string(),
    previousValue: v.number(),
    currentValue: v.number(),
    usage: v.number(),
    chargeAmount: v.optional(v.number()),
    readAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_room_period", ["roomId", "period"]),

  expenses: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.optional(v.id("properties")),
    category: v.string(),
    description: v.string(),
    amount: v.number(),
    vendor: v.optional(v.string()),
    incurredAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_incurred", ["organizationId", "incurredAt"])
    .index("by_property", ["propertyId"]),

  maintenanceTickets: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    roomId: v.optional(v.id("rooms")),
    tenantId: v.optional(v.id("tenants")),
    title: v.string(),
    description: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("urgent")),
    status: v.union(v.literal("open"), v.literal("in_progress"), v.literal("resolved"), v.literal("closed")),
    reportedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_property", ["propertyId"]),

  documents: defineTable({
    organizationId: v.id("organizations"),
    entityType: v.string(),
    entityId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_entity", ["organizationId", "entityType", "entityId"]),

  xenditAccounts: defineTable({
    organizationId: v.id("organizations"),
    businessId: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    qrisEnabled: v.boolean(),
    verifiedAt: v.optional(v.number()),
    verificationEvidence: v.optional(v.string()),
    requestedBusinessId: v.optional(v.string()),
    requestedStatus: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    requestedQrisEnabled: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_business", ["businessId"]),

  webhookEvents: defineTable({
    provider: v.literal("xendit"),
    eventId: v.string(),
    eventType: v.string(),
    payloadJson: v.string(),
    businessId: v.optional(v.string()),
    providerPaymentRequestId: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    deliveryCount: v.optional(v.number()),
    providerPaymentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    method: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    status: v.union(v.literal("processed"), v.literal("ignored"), v.literal("failed")),
    error: v.optional(v.string()),
    receivedAt: v.number(),
    processedAt: v.number(),
  })
    .index("by_provider_event", ["provider", "eventId"])
    .index("by_provider_request", ["provider", "providerPaymentRequestId"]),

  paymentRateLimits: defineTable({
    organizationId: v.id("organizations"),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_organization", ["organizationId"]),

  auditLogs: defineTable({
    organizationId: v.id("organizations"),
    authUserId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadataJson: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_created", ["organizationId", "createdAt"]),
});
