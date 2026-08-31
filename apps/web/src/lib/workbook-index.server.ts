import { serverClient } from "$lib/orpc.server";

/**
 * Cross-workbook views of imports and generated tax reports.
 *
 * ## Why this is a fan-out
 *
 * There is no `importBatch.list` procedure — batches can only be reached
 * through a reconciliation (`reconciliation.get`), and their artifacts only
 * through `importBatch.get`. Building an index therefore means walking the
 * tree: list the workbooks, fetch each one for its batches, and for the tax
 * report view fetch each batch for its artifacts.
 *
 * That is a genuine N+1, and it is deliberate rather than overlooked. The fix
 * is one flat procedure on the API package, which this redesign is scoped out
 * of. Three things keep the cost bounded until then:
 *
 *   - `serverClient` calls the router in-process, so these are direct database
 *     queries, not HTTP round trips.
 *   - Every level fans out with `Promise.all` rather than awaiting in sequence.
 *   - WORKBOOK_LIMIT caps the first level, so the walk cannot grow without
 *     bound as an organization accumulates history.
 *
 * A failure at any level resolves to null and is skipped. A tax report index
 * missing one workbook is worth more than a 500 on the whole page.
 */

const WORKBOOK_LIMIT = 40;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function count(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function dateText(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" ? value : null;
}

export type ImportRow = {
  id: string;
  workbookId: string;
  workbookName: string;
  fileName: string;
  documentType: string;
  status: string;
  rowCount: number;
  importedCount: number;
  createdAt: string | null;
};

export type ArtifactRow = {
  id: string;
  workbookId: string;
  workbookName: string;
  fileName: string;
  version: number;
  sizeBytes: number;
  createdAt: string | null;
};

/** The workbooks, each already fetched for its batches. */
async function loadWorkbooksWithBatches() {
  const list = await serverClient.reconciliation
    .list({ limit: WORKBOOK_LIMIT })
    .catch(() => null);
  const items = list?.items ?? [];

  const detailed = await Promise.all(
    items.map((item) =>
      serverClient.reconciliation.get({ id: item.id }).catch(() => null),
    ),
  );

  return detailed.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

export async function loadImportIndex(): Promise<ImportRow[]> {
  const workbooks = await loadWorkbooksWithBatches();

  const rows = workbooks.flatMap((workbook) => {
    const parent = record(workbook);
    const batches = Array.isArray(parent.importBatches) ? parent.importBatches : [];
    return batches.map(record).map((batch) => ({
      id: text(batch.id),
      workbookId: text(parent.id),
      workbookName: text(parent.name),
      fileName: text(batch.originalFilename),
      documentType: text(batch.documentType),
      status: text(batch.status),
      rowCount: count(batch.rowCount),
      importedCount: count(batch.importedCount),
      createdAt: dateText(batch.createdAt),
    }));
  });

  return rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

export async function loadArtifactIndex(): Promise<ArtifactRow[]> {
  const workbooks = await loadWorkbooksWithBatches();

  /**
   * Only COMPLETED batches can hold a generated XML, so the second fan-out is
   * filtered before it is made rather than after — a pending or failed import
   * has nothing to fetch.
   */
  const targets = workbooks.flatMap((workbook) => {
    const parent = record(workbook);
    const batches = Array.isArray(parent.importBatches) ? parent.importBatches : [];
    return batches
      .map(record)
      .filter((batch) => text(batch.status) === "COMPLETED")
      .map((batch) => ({
        batchId: text(batch.id),
        workbookId: text(parent.id),
        workbookName: text(parent.name),
      }));
  });

  const loaded = await Promise.all(
    targets.map(async (target) => {
      const batch = await serverClient.importBatch
        .get({ id: target.batchId })
        .catch(() => null);
      if (!batch) return [];
      const artifacts = Array.isArray(record(batch).artifacts)
        ? (record(batch).artifacts as unknown[])
        : [];
      return artifacts
        .map(record)
        .filter((artifact) => text(artifact.kind) === "CORETAX_XML")
        .map((artifact) => ({
          id: text(artifact.id),
          workbookId: target.workbookId,
          workbookName: target.workbookName,
          fileName: text(artifact.fileName),
          version: count(artifact.version),
          // BigInt columns arrive as strings — serializeFinanceValue keeps them
          // exact rather than risking a lossy Number on the wire.
          sizeBytes: count(artifact.sizeBytes),
          createdAt: dateText(artifact.createdAt),
        }));
    }),
  );

  return loaded
    .flat()
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}
