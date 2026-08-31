/** Shared names and dependency-free parsing for API and browser cookie consumers. */

export const APP_COOKIES = {
  agentPanel: "dashboardpt2.agentPanel",
  company: "dashboardpt2.company",
  locale: "dashboardpt2.locale",
  sidebar: "dashboardpt2.sidebar",
  textScale: "dashboardpt2.textScale",
  theme: "dashboardpt2.theme",
} as const;

export type AppCookie = keyof typeof APP_COOKIES;

/**
 * Only the names that were ever written under the old `v2.*` prefix.
 *
 * Partial rather than a full record: a preference introduced after the rename
 * has no legacy spelling, and inventing a `v2.` name for it would claim a
 * migration that never happened. `agentPanel` is the first such key.
 */
export const LEGACY_APP_COOKIES = {
  company: "v2.company",
  locale: "v2.locale",
  sidebar: "v2.sidebar",
  textScale: "v2.textScale",
  theme: "v2.theme",
} as const;

/**
 * The legacy name for a preference, or undefined if it never had one.
 *
 * `as const` above keeps each value a string literal, which is what lets a test
 * assert on `LEGACY_APP_COOKIES.locale` — but it also makes the object's keys a
 * narrower union than AppCookie, so indexing it with an arbitrary AppCookie is
 * a type error. This is the one widening point.
 */
export function legacyCookieName(name: AppCookie): string | undefined {
  return (LEGACY_APP_COOKIES as Partial<Record<AppCookie, string>>)[name];
}

/** Minimal exact-name cookie lookup. */
export function readCookie(headers: Headers, name: string): string | undefined {
  const header = headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

/** Read legacy names only while browsers are being migrated to dashboardpt2.*. */
export function readAppCookie(headers: Headers, name: AppCookie): string | undefined {
  const current = readCookie(headers, APP_COOKIES[name]);
  if (current !== undefined) return current;
  // Preferences added after the rename have no legacy spelling to fall back to.
  const legacy = legacyCookieName(name);
  return legacy === undefined ? undefined : readCookie(headers, legacy);
}
