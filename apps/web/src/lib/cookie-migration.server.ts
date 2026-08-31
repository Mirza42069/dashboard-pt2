import {
  APP_COOKIES,
  type AppCookie,
  legacyCookieName,
} from "@DashboardPT2/api/lib/cookies";
import type { RequestEvent } from "@sveltejs/kit";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function migrateLegacyCookies(cookies: RequestEvent["cookies"], secure: boolean) {
  const values = {} as Record<AppCookie, string | undefined>;

  for (const name of Object.keys(APP_COOKIES) as AppCookie[]) {
    const currentValue = cookies.get(APP_COOKIES[name]);
    const legacyName = legacyCookieName(name);
    const legacyValue = legacyName === undefined ? undefined : cookies.get(legacyName);
    values[name] = currentValue ?? legacyValue;

    if (currentValue === undefined && legacyValue !== undefined) {
      cookies.set(APP_COOKIES[name], legacyValue, {
        httpOnly: false,
        maxAge: COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure,
      });
    }
    if (legacyName !== undefined && legacyValue !== undefined) {
      cookies.delete(legacyName, { path: "/", secure });
    }
  }

  return values;
}
