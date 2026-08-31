import { loadImportIndex } from "$lib/workbook-index.server";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => ({
  imports: await loadImportIndex().catch(() => []),
});
