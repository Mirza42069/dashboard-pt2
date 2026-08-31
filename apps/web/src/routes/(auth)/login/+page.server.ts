import { getSession } from "$lib/session";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  // Resolved against the auth API, not inferred from the cookie: a stale cookie
  // must fall through to the form so the user can sign in again, rather than
  // being volleyed to /dashboard and straight back here.
  const session = await getSession(event);
  if (session?.user) {
    redirect(302, "/dashboard");
  }
  return {};
};
