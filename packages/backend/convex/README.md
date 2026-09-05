# Backend Operations

All amounts are integer IDR. Dynamic QRIS accepts Rp1 through Rp10,000,000.
This backend does not activate real payment routing from user-provided account IDs.

## Configuration and deployment

See `../.env.example` for variable names. Set runtime secrets in the actual Convex
deployment environment. Do not put Xendit keys in client-visible variables.
Configure `SITE_URL`, `BETTER_AUTH_SECRET`, `XENDIT_SECRET_KEY`, and
`XENDIT_WEBHOOK_TOKEN`. Google credentials are optional.

Register the deployment's `/xendit/webhook` HTTP endpoint for Payments API v3
events. It verifies `x-callback-token`. Supported event/status pairs are
`payment.capture`/`SUCCEEDED`, `payment.failure`/`FAILED`, and
`payment_request.expiry`/`EXPIRED`. Authorization, refunds, and other event types
do not settle invoices. Captures require exactly one full capture in
`data.captures[]`, matching `request_amount`, currency, channel, and the request's
business snapshot. The callback is acknowledged after durable processing or
recording for reconciliation, not necessarily after invoice settlement.

From `packages/backend`, run:

```sh
bun run check-types
bun run test
bun x convex codegen --typecheck enable
```

Deployment/codegen must complete against a configured backend before release.
The local API declarations are schema/module-derived for useful local checking;
the Better Auth component declaration remains ungenerated (`any`) until codegen.
Tests use `bun:test`, actual handlers and the Effect HTTP client with a serialized,
rollback-capable in-memory database double. They do not prove Convex OCC behavior,
schema deployment, live authentication, or Xendit sandbox settlement. The timeout
test intentionally takes about 20 seconds. No production code returns a demo QR.

## Account binding

`xenditAccounts.update` retains its input shape for the existing settings form.
It stores `requestedBusinessId`, `requestedStatus`, and `requestedQrisEnabled`;
it does not modify actual routing or verification. A new request has empty actual
`businessId`, inactive status, and QRIS disabled. Do not display a configuration
request as successful activation.

An authorized deployment operator must verify the organization's legal ownership
or delegated authority over the XenPlatform subaccount, then invoke the internal
`xenditAccounts.provision({ organizationId, businessId, qrisEnabled, evidence })`.
Evidence is an operator ticket/reference, never a secret or full KYC document.
The internal mutation enforces unique account binding and writes an audit record.
Knowing a business ID, or successfully fetching it using the platform key, is NOT
proof that an application organization owns it. There is no public provisioning
endpoint. Set `qrisEnabled: false` internally to disable issuance.

Existing accounts without `verifiedAt` fail closed even if previously marked
active by an owner. Existing payment requests without `businessId` are not
retroactively bound to today's account configuration. Verify these historical
records against Xendit before any operator-managed migration or reconciliation.

## QR creation and recovery

Both entry points use the same reservation transaction and provider client:

- `payments.createQris({ organizationId, invoiceId, paymentLinkId?, expiresInMinutes? })` checks the authenticated user's active membership.
- `publicPayments.createQris({ token })` checks a live payment link; it never impersonates a member and accepts no organization, invoice, amount, or business ID.

Both return this display-only discriminated union (provider/internal IDs are no
longer returned by the member action):

```ts
type QrisResult =
  | { status: "ready"; qrString: string; amount: number; currency: "IDR"; expiresAt: number }
  | { status: "processing" | "rate_limited" | "unavailable" };
```

The frontend must branch on `status` before displaying a QR. The token page can
call its action to request a replacement after expiry and continue subscribing to
`publicPayments.getByToken`. Invalid/revoked/expired tokens get a generic result.
Do not aggressively poll the action or show "retry payment" for `processing`.

A single atomic `reserveQris` mutation authorizes the caller, validates the invoice
and verified account, reuses an existing pending QR, or inserts a `creating` row
before the external POST. This index read/insert relies on Convex serializable
transactions for concurrent callers. Rate limits are shared by member and token
paths: at least 60 seconds between new reservations, 12 per invoice per rolling
24 hours, and 30 per organization per fixed 60-second window. Changing links does
not reset them. These limit provider creation, not inbound action traffic; deploy
edge abuse protection for anonymous request floods.

The Effect HTTP operation has a 20-second timeout and no automatic POST retry.
Timeouts, network errors, malformed/mismatched responses, HTTP errors, and failed
persistence leave `unknown` (or `creating` if the action dies). Neither state
expires into a retry. A validated callback can correlate by the durable random
`referenceId` and immutable business snapshot even before the POST response is
stored. A payment-attempt failure alone does not invalidate its QR.

Operators can inspect `payments.listReconciliation({ organizationId })` with
owner/admin access, plus internal webhook records and audit logs. For an uncertain
request, first retrieve/confirm its state using the reference and business in
Xendit. Never infer failure from a local expiry, timeout, or guessed-ID 404.

- If a valid live QR exists, its verified provider response may be attached using internal `payments.saveQrisRequest` (request ID, matching reference/amount, provider request ID, QR string, and provider expiry no later than the reserved expiry). This never sends another POST.
- If money was captured, replay the authentic callback after checking the snapshot. Do not close it as failed.
- Only after authoritative confirmation that no collectible payment exists, an operator may invoke internal `payments.closeUncertain({ requestId, evidence, confirmedNoCollectiblePayment: true })`. It requires a reservation at least two minutes old and audits the decision. Verification of this evidence is an operator responsibility, not an automated provider lookup.

Duplicate webhook deliveries increment a count, and duplicate payment IDs do not
double book funds. Distinct additional payments are recorded. A capture against
a void/draft/already-paid or amount-changed invoice records the receipt and a
`payment.reconciliation_required` audit without silently overwriting the invoice.
Its event is flagged `failed` for operator review. Refund execution and automated
reconciliation of these exceptions are not implemented.

## Organization and lease APIs

`organizations.list({})` returns only the caller's active memberships.
`organizations.ensureCurrent({ name?, createNew: true })` explicitly creates an
additional organization with the caller as owner; omission preserves the existing
ensure-first behavior. Every business operation still takes an explicitly checked
organization ID.

`rooms.updateStatus` cannot remove occupied status while an active lease exists,
or mark a room occupied without a lease. Owner/admin
`leases.end({ organizationId, leaseId, endDate? })` ends an active lease and releases
its room in one mutation. It is idempotent for ended leases. End dates must be
between lease start and now; scheduling future move-outs is not implemented.
If historical corruption left another active lease, the room remains occupied.
Existing invoices are retained and are not automatically prorated or voided.
