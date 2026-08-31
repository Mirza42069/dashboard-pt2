import { expect, test } from "bun:test";
import {
  APP_COOKIES,
  LEGACY_APP_COOKIES,
} from "@DashboardPT2/api/lib/cookies";

import { migrateLegacyCookies } from "./cookie-migration.server";

type CookieStore = Parameters<typeof migrateLegacyCookies>[0];

function cookieStore(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  const deleted: string[] = [];
  const written: string[] = [];
  const cookies = {
    get: (name: string) => values.get(name),
    set: (name: string, value: string) => {
      values.set(name, value);
      written.push(name);
    },
    delete: (name: string) => {
      values.delete(name);
      deleted.push(name);
    },
  } as unknown as CookieStore;

  return { cookies, deleted, values, written };
}

test("legacy cookies are copied to dashboardpt2 names and expired", () => {
  const store = cookieStore({
    [LEGACY_APP_COOKIES.locale]: "en",
    [LEGACY_APP_COOKIES.sidebar]: "collapsed",
  });

  const migrated = migrateLegacyCookies(store.cookies, false);

  expect(migrated.locale).toBe("en");
  expect(migrated.sidebar).toBe("collapsed");
  expect(store.values.get(APP_COOKIES.locale)).toBe("en");
  expect(store.values.get(APP_COOKIES.sidebar)).toBe("collapsed");
  expect(store.deleted).toContain(LEGACY_APP_COOKIES.locale);
  expect(store.deleted).toContain(LEGACY_APP_COOKIES.sidebar);
});

test("current cookies take precedence while legacy duplicates are expired", () => {
  const store = cookieStore({
    [APP_COOKIES.locale]: "id",
    [LEGACY_APP_COOKIES.locale]: "en",
  });

  const migrated = migrateLegacyCookies(store.cookies, true);

  expect(migrated.locale).toBe("id");
  expect(store.values.get(APP_COOKIES.locale)).toBe("id");
  expect(store.written).not.toContain(APP_COOKIES.locale);
  expect(store.deleted).toContain(LEGACY_APP_COOKIES.locale);
});
