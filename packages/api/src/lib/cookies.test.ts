import { expect, test } from "bun:test";

import { APP_COOKIES, readAppCookie } from "./cookies";

test("app cookies use the dashboardpt2 prefix", () => {
  expect(APP_COOKIES).toEqual({
    agentPanel: "dashboardpt2.agentPanel",
    company: "dashboardpt2.company",
    locale: "dashboardpt2.locale",
    sidebar: "dashboardpt2.sidebar",
    textScale: "dashboardpt2.textScale",
    theme: "dashboardpt2.theme",
  });
});

test("app cookies prefer the current name and temporarily accept the legacy name", () => {
  expect(readAppCookie(new Headers({ cookie: "v2.locale=en" }), "locale")).toBe("en");
  expect(
    readAppCookie(
      new Headers({ cookie: "v2.locale=en; dashboardpt2.locale=id" }),
      "locale",
    ),
  ).toBe("id");
});
