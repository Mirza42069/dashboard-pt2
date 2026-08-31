import { serverClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

/** Matches the grid's own page size — see PAGE_SIZE in +page.svelte. */
const PAGE_SIZE = 50;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

/**
 * The workbook, plus the first page of its most recent import.
 *
 * The rows are prefetched rather than left to the client query for the reason
 * the overview page prefetched its summary: without it the grid renders a
 * spinner on the server and the real table one round trip later, so the first
 * thing a reader sees on their own data is a loading state. `initialData` on the
 * client query means the server HTML already holds the grid.
 *
 * Which batch counts as active has to be decided here as well as in the
 * component, and both pick the same one: the newest batch that carries a
 * documentType. A batch without one predates the Coretax import path and has no
 * rows to show.
 */
export const load: PageServerLoad = async ({ params }) => {
  const reconciliation = await serverClient.reconciliation
    .get({ id: params.id })
    .catch(() => null);

  if (!reconciliation) return { reconciliation: null, batch: null, rows: null };

  const batches = record(reconciliation).importBatches;
  const active = (Array.isArray(batches) ? batches.map(record) : []).find(
    (item) => item.documentType,
  );
  const activeId = typeof active?.id === "string" ? active.id : null;

  if (!activeId) return { reconciliation, batch: null, rows: null };

  // Both fail soft: a workbook whose import cannot be read should still render
  // its header and its import affordance rather than a 500.
  const [batch, rows] = await Promise.all([
    serverClient.importBatch.get({ id: activeId }).catch(() => null),
    serverClient.importBatch
      .listRows({ id: activeId, page: 0, limit: PAGE_SIZE })
      .catch(() => null),
  ]);

  return { reconciliation, batch, rows };
};
