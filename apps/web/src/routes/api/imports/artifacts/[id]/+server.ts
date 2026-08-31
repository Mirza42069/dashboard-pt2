import { auth } from "@DashboardPT2/auth";
import database from "@DashboardPT2/db";
import { get } from "@vercel/blob";
import { error, type RequestHandler } from "@sveltejs/kit";

function attachmentName(name: string) {
  return name.replace(/[^\x20-\x7e]|["\\]/g, "-");
}

function contentDisposition(name: string) {
  return `attachment; filename="${attachmentName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) error(401, "Not authenticated");
  const artifact = await database.importArtifact.findFirst({
    where: {
      id: params.id,
      organization: { memberships: { some: { userId: session.user.id } } },
    },
  });
  if (!artifact) error(404, "Artifact not found");
  const result = await get(artifact.objectPath, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) error(404, "Stored artifact not found");

  return new Response(result.stream, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": contentDisposition(artifact.fileName),
      "Content-Type": artifact.contentType,
      "X-Content-Type-Options": "nosniff",
      ETag: result.blob.etag,
    },
  });
};
