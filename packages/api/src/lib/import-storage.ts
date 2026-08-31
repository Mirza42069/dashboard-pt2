import { createHash, randomUUID } from "node:crypto";

import { del, get, head, put } from "@vercel/blob";

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const XML_CONTENT_TYPE = "application/xml";

export function importObjectPrefix(organizationId: string, importBatchId: string) {
  return `organizations/${organizationId}/imports/${importBatchId}`;
}

export function originalObjectPath(organizationId: string, importBatchId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "workbook.xlsx";
  return `${importObjectPrefix(organizationId, importBatchId)}/original/${randomUUID()}-${safeName}`;
}

export function generatedXmlPath(organizationId: string, importBatchId: string, documentType: string) {
  return `${importObjectPrefix(organizationId, importBatchId)}/generated/${documentType.toLowerCase()}-${randomUUID()}.xml`;
}

export function sha256(bytes: ArrayBuffer | Uint8Array | string) {
  const value = typeof bytes === "string" ? bytes : Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes);
  return createHash("sha256").update(value).digest("hex");
}

export async function readPrivateBlob(objectPath: string) {
  const result = await get(objectPath, { access: "private", useCache: false });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error("Stored file was not found.");
  }
  const bytes = await new Response(result.stream).arrayBuffer();
  return { bytes, blob: result.blob };
}

export async function inspectPrivateBlob(objectPath: string) {
  return head(objectPath);
}

export async function storePrivateXml(objectPath: string, xml: string) {
  return put(objectPath, xml, {
    access: "private",
    allowOverwrite: false,
    contentType: XML_CONTENT_TYPE,
  });
}

export async function deletePrivateBlob(objectPath: string) {
  await del(objectPath);
}
