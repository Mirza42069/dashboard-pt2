import { serverClient } from "$lib/orpc.server";

import { normalizeExceptionList, normalizeReconciliationDetail } from "../finance-api";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const [reconciliation, exceptions] = await Promise.all([
    serverClient.reconciliation
      .get({ id: params.id })
      .then(normalizeReconciliationDetail)
      .catch(() => null),
    serverClient.exceptions
      .list({ reconciliationId: params.id, status: "OPEN", limit: 100 })
      .then(normalizeExceptionList)
      .catch(() => null),
  ]);

  return { reconciliation, exceptions };
};
