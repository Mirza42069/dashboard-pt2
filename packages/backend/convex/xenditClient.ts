import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientRequest from "@effect/platform/HttpClientRequest";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { assertQrisAmount } from "./paymentRules";

const XenditAction = Schema.Struct({
  type: Schema.String,
  descriptor: Schema.optional(Schema.String),
  value: Schema.String,
});

const XenditPaymentRequest = Schema.Struct({
  payment_request_id: Schema.String,
  reference_id: Schema.String,
  status: Schema.String,
  request_amount: Schema.Union(Schema.Number, Schema.NumberFromString),
  currency: Schema.Literal("IDR"),
  business_id: Schema.String,
  channel_code: Schema.Literal("QRIS"),
  type: Schema.Literal("PAY"),
  channel_properties: Schema.Struct({ expires_at: Schema.String }),
  actions: Schema.Array(XenditAction),
});

export class XenditConfigurationError extends Data.TaggedError("XenditConfigurationError")<{ readonly message: string }> {}
export class XenditTransportError extends Data.TaggedError("XenditTransportError")<{ readonly message: string }> {}
export class XenditResponseError extends Data.TaggedError("XenditResponseError")<{ readonly status: number; readonly message: string }> {}
export class XenditDecodeError extends Data.TaggedError("XenditDecodeError")<{ readonly message: string }> {}

export interface CreateQrisInput {
  readonly secretKey: string;
  readonly businessId: string;
  readonly referenceId: string;
  readonly amount: number;
  readonly expiresAt: number;
}

export interface CreateQrisResult {
  readonly paymentRequestId: string;
  readonly referenceId: string;
  readonly status: string;
  readonly amount: number;
  readonly qrString: string;
  readonly expiresAt: number;
}

export class XenditClient extends Effect.Service<XenditClient>()("app/XenditClient", {
  effect: Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    return {
      createQris: (input: CreateQrisInput) => Effect.gen(function* () {
        yield* Effect.try({ try: () => assertQrisAmount(input.amount), catch: () => new XenditConfigurationError({ message: "Nominal QRIS tidak valid." }) });
        if (!input.secretKey || !input.businessId) {
          return yield* Effect.fail(new XenditConfigurationError({ message: "Konfigurasi Xendit belum lengkap." }));
        }
        const request = HttpClientRequest.post("https://api.xendit.co/v3/payment_requests").pipe(
          HttpClientRequest.setHeaders({
            "api-version": "2024-11-11",
            "for-user-id": input.businessId,
          }),
          HttpClientRequest.basicAuth(Redacted.make(input.secretKey), Redacted.make("")),
          HttpClientRequest.bodyUnsafeJson({
            reference_id: input.referenceId,
            type: "PAY",
            country: "ID",
            currency: "IDR",
            request_amount: input.amount,
            capture_method: "AUTOMATIC",
            channel_code: "QRIS",
            channel_properties: {
              qr_string_type: "DYNAMIC",
              expires_at: new Date(input.expiresAt).toISOString(),
            },
          }),
        );
        const response = yield* client.execute(request).pipe(
          Effect.mapError(() => new XenditTransportError({ message: "Tidak dapat menghubungi Xendit." })),
        );
        if (response.status < 200 || response.status >= 300) {
          const body = yield* response.text.pipe(Effect.catchAll(() => Effect.succeed("")));
          return yield* Effect.fail(new XenditResponseError({
            status: response.status,
            message: body.slice(0, 500) || "Xendit menolak permintaan pembayaran.",
          }));
        }
        const unknownBody = yield* response.json.pipe(
          Effect.mapError(() => new XenditDecodeError({ message: "Respons Xendit bukan JSON yang valid." })),
        );
        const decoded = yield* Schema.decodeUnknown(XenditPaymentRequest)(unknownBody).pipe(
          Effect.mapError(() => new XenditDecodeError({ message: "Format respons Xendit tidak dikenali." })),
        );
        const qrString = decoded.actions.find((action) => action.descriptor === "QR_STRING" && action.type === "PRESENT_TO_CUSTOMER")?.value;
        const expiresAt = Date.parse(decoded.channel_properties.expires_at);
        if (!qrString?.trim() || !decoded.payment_request_id.trim() || decoded.business_id !== input.businessId || decoded.reference_id !== input.referenceId || decoded.request_amount !== input.amount || decoded.status !== "REQUIRES_ACTION" || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || expiresAt > input.expiresAt) {
          return yield* Effect.fail(new XenditDecodeError({ message: "Respons QRIS Xendit tidak cocok." }));
        }
        return {
          paymentRequestId: decoded.payment_request_id,
          referenceId: decoded.reference_id,
          status: decoded.status,
          amount: decoded.request_amount,
          qrString,
          expiresAt,
        } satisfies CreateQrisResult;
      }),
    };
  }),
}) {}

export function createQrisPaymentRequest(input: CreateQrisInput) {
  return XenditClient.pipe(
    Effect.flatMap((client) => client.createQris(input)),
    Effect.provide(XenditClient.Default),
    Effect.provide(FetchHttpClient.layer),
    Effect.timeoutFail({ duration: "20 seconds", onTimeout: () => new XenditTransportError({ message: "Waktu tunggu Xendit habis; hasil pembayaran perlu direkonsiliasi." }) }),
  );
}
