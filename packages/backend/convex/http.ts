import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { parsePaymentNotification } from "./paymentRules";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function secureEqual(left: string, right: string) {
  const size = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

http.route({
  path: "/xendit/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN;
    if (!expectedToken) return new Response("Webhook Xendit belum dikonfigurasi.", { status: 503 });
    const callbackToken = request.headers.get("x-callback-token") ?? "";
    if (!secureEqual(callbackToken, expectedToken)) return new Response("Token webhook tidak valid.", { status: 401 });

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 1_000_000) return new Response("Payload webhook terlalu besar.", { status: 413 });
    const payloadJson = await request.text();
    if (new TextEncoder().encode(payloadJson).byteLength > 750_000) {
      return new Response("Payload webhook terlalu besar.", { status: 413 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(payloadJson);
    } catch {
      return new Response("Payload webhook bukan JSON yang valid.", { status: 400 });
    }
    if (!isRecord(payload)) return new Response("Payload webhook tidak valid.", { status: 400 });
    const eventId = request.headers.get("webhook-id")
      ?? request.headers.get("x-callback-id")
      ?? optionalString(payload.id)
      ?? optionalString(payload.webhook_id)
      ?? `sha256:${await sha256(payloadJson)}`;
    await ctx.runMutation(internal.webhooks.processXendit, {
      eventId,
      payloadJson,
      ...parsePaymentNotification(payload),
    });
    return new Response("Diterima", { status: 200 });
  }),
});

export default http;
