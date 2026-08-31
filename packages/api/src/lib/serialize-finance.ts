type DecimalLike = {
  constructor?: { name?: string };
  toString(): string;
};

export type SerializedFinance<T> = T extends bigint
  ? string
  : T extends Date
    ? Date
    : T extends readonly (infer Item)[]
      ? SerializedFinance<Item>[]
      : T extends object
        ? { [Key in keyof T]: SerializedFinance<T[Key]> }
        : T;

function isDecimal(value: object): value is DecimalLike {
  return value.constructor?.name === "Decimal";
}

/** Converts Prisma Decimal and bigint values without losing financial precision. */
export function serializeFinanceValue<T>(value: T): SerializedFinance<T> {
  if (typeof value === "bigint") return value.toString() as SerializedFinance<T>;
  if (value instanceof Date) return value as SerializedFinance<T>;
  if (Array.isArray(value)) return value.map(serializeFinanceValue) as SerializedFinance<T>;
  if (value && typeof value === "object") {
    if (isDecimal(value)) return value.toString() as SerializedFinance<T>;
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, serializeFinanceValue(nested)]),
    ) as SerializedFinance<T>;
  }
  return value as SerializedFinance<T>;
}
