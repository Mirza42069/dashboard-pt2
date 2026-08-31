import { requireSession } from "$lib/session";

import type { LayoutServerLoad } from "./$types";

/**
 * Authoritative gate for every page in this group.
 *
 * The user is passed down rather than re-fetched in the browser: a client-side
 * session hook is always pending during SSR, so the chrome would render a
 * skeleton on the server and the real menu on the client — a hydration mismatch
 * that makes the framework discard the server HTML and refetch every query.
 */
export const load: LayoutServerLoad = async (event) => {
  const { user } = await requireSession(event);

  return {
    shellUser: {
      name: user.name,
      email: user.email,
      role: user.role ?? "user",
      trialEndsAt: user.trialEndsAt ?? null,
    },
  };
};
