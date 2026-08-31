import type { LayoutServerLoad } from "./$types";

/** Preferences are resolved once per request in hooks.server.ts. */
export const load: LayoutServerLoad = ({ locals }) => ({
  preferences: locals.preferences,
});
