import { getSession } from "$lib/session";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

/**
 * Signed in, the product is the destination and this page has nothing to add,
 * so it redirects. Signed out it renders, and what it renders is now both the
 * explanation and the sign-in form — /login redirects here rather than the
 * other way round.
 *
 * The session is resolved against the auth API rather than inferred from the
 * cookie: a stale cookie must fall through to the form so the user can sign in
 * again, rather than being volleyed to /workbooks and straight back here.
 */
export const load: PageServerLoad = async (event) => {
  const session = await getSession(event);
  if (session?.user) redirect(302, "/workbooks");
  return {};
};
