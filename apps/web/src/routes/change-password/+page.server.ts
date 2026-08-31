import { requireSession } from "$lib/session";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  await requireSession(event, { skipPasswordChangeRedirect: true });
  return {};
};
