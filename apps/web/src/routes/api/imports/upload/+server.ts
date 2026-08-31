import { auth } from "@DashboardPT2/auth";
import database from "@DashboardPT2/db";
import { MAX_AI_WORKBOOK_BYTES } from "@DashboardPT2/api/lib/workbook-limits";
import { XLSX_CONTENT_TYPE } from "@DashboardPT2/api/lib/import-storage";
import { hasFinancePermission, normalizedFinanceRole } from "@DashboardPT2/api/lib/finance-permissions";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) error(401, "Not authenticated");
  const body = (await request.json()) as HandleUploadBody;

  try {
    const response = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = JSON.parse(clientPayload ?? "{}") as { importBatchId?: string };
        if (!payload.importBatchId) throw new Error("Import batch is required.");
        const batch = await database.importBatch.findFirst({
          where: { id: payload.importBatchId, createdById: session.user.id, status: "PENDING" },
          select: {
            id: true,
            organizationId: true,
            sourceMetadata: true,
            organization: {
              select: { memberships: { where: { userId: session.user.id }, select: { role: true }, take: 1 } },
            },
          },
        });
        if (!batch) throw new Error("Import batch not found or no longer accepts uploads.");
        const role = normalizedFinanceRole(batch.organization.memberships[0]?.role);
        if (!hasFinancePermission(role, "import:create")) throw new Error("Your organization role no longer permits uploads.");
        const expectedPrefix = `organizations/${batch.organizationId}/imports/${batch.id}/original/`;
        const metadata = batch.sourceMetadata && typeof batch.sourceMetadata === "object" && !Array.isArray(batch.sourceMetadata)
          ? batch.sourceMetadata as Record<string, unknown>
          : {};
        if (
          !pathname.startsWith(expectedPrefix) ||
          pathname !== metadata.authorizedObjectPath ||
          !pathname.toLowerCase().endsWith(".xlsx")
        ) {
          throw new Error("Upload path is invalid.");
        }
        return {
          access: "private" as const,
          allowedContentTypes: [XLSX_CONTENT_TYPE],
          maximumSizeInBytes: MAX_AI_WORKBOOK_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ importBatchId: batch.id, userId: session.user.id }),
        };
      },
    });
    return json(response);
  } catch (cause) {
    error(400, cause instanceof Error ? cause.message : "Upload could not be authorized.");
  }
};
