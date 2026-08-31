export const SIDEBAR_COOKIE = "v2.sidebar";

/**
 * Read server-side so a collapsed sidebar renders collapsed on the very first
 * paint. Doing this from localStorage in an effect would flash the wide sidebar
 * on every navigation.
 */
export function resolveSidebarCollapsed(value: string | undefined): boolean {
  return value === "collapsed";
}

export function writeSidebarCookie(collapsed: boolean) {
  document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; samesite=lax`;
}
