import { getSession } from "$lib/session";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

/**
 * Signed in, the product is the destination and this page has nothing to add,
 * so it redirects. Signed out it renders: the marketing page used to redirect
 * to /login too, which meant the one surface describing what this is could
 * never actually be reached.
 */
export const load: PageServerLoad = async (event) => {
  const session = await getSession(event);
  if (session?.user) redirect(302, "/workbooks");
  return {};
};
