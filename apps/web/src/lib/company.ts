import { APP_COOKIES } from "@DashboardPT2/api/lib/cookies";

/**
 * The admin's active company.
 *
 * A cookie rather than client state because the API needs it on every request
 * — tRPC calls, the /photos/:id image requests the browser makes on its own,
 * and server-rendered pages — and a cookie is the only carrier all three share.
 * Regular users ignore this entirely: their scope comes from user.companyId,
 * so setting the cookie cannot widen what they see.
 *
 * The shared name also lets the API resolve the company on RPC requests.
 */
export const COMPANY_COOKIE = APP_COOKIES.company;

export function writeCompanyCookie(companyId: string) {
  // `secure` outside development for the same reason as the auth cookie: plain
  // http locally, encrypted everywhere else. Omitted on localhost because the
  // dev server is http and the browser would drop the cookie entirely.
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${COMPANY_COOKIE}=${encodeURIComponent(companyId)}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; samesite=lax${secure}`;
}
