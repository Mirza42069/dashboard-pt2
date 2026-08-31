import { serverClient } from "$lib/orpc.server";

import {
  normalizeDashboardSummary,
  normalizeReconciliationList,
} from "../reconciliations/finance-api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const [summary, reconciliations] = await Promise.all([
    serverClient.dashboard
      .summary()
      .then(normalizeDashboardSummary)
      .catch(() => null),
    serverClient.reconciliation
      .list({ limit: 25 })
      .then(normalizeReconciliationList)
      .catch(() => null),
  ]);

  return { summary, reconciliations };
};
