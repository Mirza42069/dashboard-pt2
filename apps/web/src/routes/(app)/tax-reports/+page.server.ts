import { loadArtifactIndex } from "$lib/workbook-index.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => ({
  artifacts: await loadArtifactIndex().catch(() => []),
});
