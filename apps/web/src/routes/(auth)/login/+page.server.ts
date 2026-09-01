import { getSession } from "$lib/session";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

/**
 * The sign-in form lives on `/` now — see routes/+page.svelte.
 *
 * This route is kept rather than deleted because it is the address people and
 * code already hold: bookmarks, the sign-out in user-menu, and the sign-out on
 * /trial-ended. It forwards ?next= untouched so a deep link that was refused
 * for want of a session still returns the user to where they were going.
 *
 * The session is still resolved against the auth API rather than inferred from
 * the cookie, for the same reason it always was: a stale cookie must fall
 * through to the form so the user can sign in again, rather than being volleyed
 * to /workbooks and straight back here.
 */
export const load: PageServerLoad = async (event) => {
  const session = await getSession(event);
  if (session?.user) {
    redirect(302, "/workbooks");
  }

  const next = event.url.searchParams.get("next");
  redirect(302, next ? `/?next=${encodeURIComponent(next)}` : "/");
};
