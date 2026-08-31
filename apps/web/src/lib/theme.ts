import { APP_COOKIES } from "@DashboardPT2/api/lib/cookies";

export const THEMES = ["light"] as const;
export type Theme = (typeof THEMES)[number];

export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE = APP_COOKIES.theme;

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Resolved from a cookie in hooks.server.ts and stamped straight onto <html>,
 * which is why this app does not use a theme library. Those inject an inline
 * script to apply the stored theme before paint, and it can only ever run after
 * the server has already sent the wrong class. A cookie is known before the
 * response is written, so the correct theme is in the very first byte of HTML:
 * no script, no flash.
 *
 * Tickmark intentionally exposes one light theme so every operational screen
 * uses the same contrast, chart palette, and semantic status colors.
 */
export function resolveTheme(value: string | undefined): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}
