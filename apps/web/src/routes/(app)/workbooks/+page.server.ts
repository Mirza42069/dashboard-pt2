import { serverClient } from "$lib/orpc.server";

import type { PageServerLoad } from "./$types";

/**
 * Prefetched so the list is in the first paint rather than arriving after it.
 * Failures resolve to null and the page renders its empty state — the
 * convention every load in this app follows, because a 500 on the landing page
 * is a worse answer than an empty table.
 */
export const load: PageServerLoad = async () => {
  const workbooks = await serverClient.reconciliation
    .list({ limit: 50 })
    .catch(() => null);

  return { workbooks };
};
