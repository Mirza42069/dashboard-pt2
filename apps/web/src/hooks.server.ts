import "./lib/orpc.server";
import { building } from "$app/environment";
import { auth } from "@DashboardPT2/auth";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";

import { LOCALE_COOKIE, resolveLocale } from "./i18n";
import { resolveSidebarCollapsed, SIDEBAR_COOKIE } from "./lib/sidebar";
import { resolveTextScale, TEXT_SCALE_CLASS, TEXT_SCALE_COOKIE } from "./lib/text-scale";
import { resolveTheme, THEME_COOKIE } from "./lib/theme";

/**
 * Resolves the four display preferences from cookies and stamps them onto
 * <html> before the response is written.
 *
 * This is the whole reason they are cookies rather than localStorage: the
 * correct language, theme and text scale are known here, ahead of the first
 * byte, so nothing has to be corrected after paint. The React template did the
 * same read with next/headers in its root layout.
 */
const preferences: Handle = ({ event, resolve }) => {
  const locale = resolveLocale(event.cookies.get(LOCALE_COOKIE));
  const theme = resolveTheme(event.cookies.get(THEME_COOKIE));
  const textScale = resolveTextScale(event.cookies.get(TEXT_SCALE_COOKIE));
  const sidebarCollapsed = resolveSidebarCollapsed(event.cookies.get(SIDEBAR_COOKIE));

  event.locals.preferences = { locale, theme, textScale, sidebarCollapsed };

  const htmlClass = TEXT_SCALE_CLASS[textScale];

  return resolve(event, {
    // Only the first chunk carries <html>, and replace() without /g stops at
    // the first hit, so this cannot corrupt page content that happens to
    // contain the same literal.
    transformPageChunk: ({ html }) =>
      html
        .replace("%app.lang%", locale)
        .replace("%app.htmlClass%", htmlClass)
        .replace("%app.theme%", theme),
  });
};

const authentication: Handle = ({ event, resolve }) =>
  svelteKitHandler({ event, resolve, auth, building });

export const handle = sequence(preferences, authentication);
