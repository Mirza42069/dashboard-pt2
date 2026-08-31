import { getSession } from "$lib/session";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const session = await getSession(event);
  redirect(302, session?.user ? "/dashboard" : "/login");
};
