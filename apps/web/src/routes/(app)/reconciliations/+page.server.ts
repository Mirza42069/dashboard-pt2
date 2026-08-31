import { serverClient } from "$lib/orpc.server";

import { normalizeReconciliationList } from "./finance-api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => ({
  reconciliations: await serverClient.reconciliation
    .list({ limit: 50 })
    .then(normalizeReconciliationList)
    .catch(() => null),
});
