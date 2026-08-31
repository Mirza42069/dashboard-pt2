import { expect, test } from "bun:test";

import { serializeFinanceValue } from "./serialize-finance";

test("serializes decimal-like and bigint finance values without changing dates", () => {
  class Decimal {
    toString() {
      return "9007199254740993.01";
    }
  }
  const createdAt = new Date("2026-08-31T00:00:00.000Z");

  expect(
    serializeFinanceValue({ amount: new Decimal(), count: 9_007_199_254_740_993n, createdAt }),
  ).toEqual({ amount: "9007199254740993.01", count: "9007199254740993", createdAt });
});

test("serializes Neon adapter Decimal2 values", () => {
  const decimal = Object.assign(
    Object.create({
      toString() {
        return "125000.50";
      },
      get [Symbol.toStringTag]() {
        return "Decimal";
      },
    }),
    {
      constructor: function Decimal2() {},
      s: 1,
      e: 5,
      d: [125_000, 5_000_000],
    },
  );

  expect(serializeFinanceValue({ openAmount: decimal })).toEqual({ openAmount: "125000.50" });
});
