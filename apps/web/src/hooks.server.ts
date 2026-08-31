import "./lib/orpc.server";
import { building } from "$app/environment";
import { auth } from "@DashboardPT2/auth";
import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { svelteKitHandler } from "better-auth/svelte-kit";

import { resolveLocale } from "./i18n";
import { resolveAgentPanel } from "./lib/agent-panel";
import { migrateLegacyCookies } from "./lib/cookie-migration.server";
import { resolveSidebarCollapsed } from "./lib/sidebar";
import { resolveTextScale, TEXT_SCALE_CLASS } from "./lib/text-scale";
import { resolveTheme } from "./lib/theme";

/**
 * Resolves the display preferences from cookies and stamps the ones that
 * affect <html> onto it before the response is written.
 *
 * This is the whole reason they are cookies rather than localStorage: the
 * correct language, theme and text scale are known here, ahead of the first
 * byte, so nothing has to be corrected after paint. The React template did the
 * same read with next/headers in its root layout.
 */
const preferences: Handle = ({ event, resolve }) => {
  const cookies = migrateLegacyCookies(event.cookies, event.url.protocol === "https:");
  const locale = resolveLocale(cookies.locale);
  const theme = resolveTheme(cookies.theme);
  const textScale = resolveTextScale(cookies.textScale);
  const sidebarCollapsed = resolveSidebarCollapsed(cookies.sidebar);
  const agentPanel = resolveAgentPanel(cookies.agentPanel);

  event.locals.preferences = { locale, theme, textScale, sidebarCollapsed, agentPanel };

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
