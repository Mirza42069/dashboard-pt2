/**
 * Money always renders Indonesian style — `Rp100.000`: no space after Rp, dots
 * for thousands. The amount is rupiah whatever language the UI is in, so the
 * currency's own convention travels with it rather than switching to
 * `IDR 100,000` on the English UI.
 *
 * Built from `style: "decimal"` and a manual prefix rather than
 * `style: "currency"`, because Intl inserts a non-breaking space after "Rp"
 * that cannot be turned off.
 *
 * Quantities and dates *do* follow the UI locale — they aren't rupiah.
 *
 * Client components get these via useFormat() (lib/use-format.ts). The factory
 * is memoized per locale, so formatter instances are created once.
 */

export const CURRENCY_PREFIX = "Rp";

/** Grouping/decimal marks for money are pinned to Indonesian, never the UI locale. */
const MONEY_LOCALE = "id-ID";

const rupiahInput = new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits: 4 });
const rupiahIntegerInput = new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits: 0 });

/** Editable Rupiah text: dots group thousands and a comma separates decimals. */
export function parseRupiahInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return normalized === "" || !Number.isFinite(parsed) ? 0 : parsed;
}

/** Groups an editable Rupiah value without adding the `Rp` prefix. */
export function formatRupiahInput(value: number) {
  return Number.isFinite(value) ? rupiahInput.format(Math.max(0, value)) : "0";
}

/** Preserves a trailing decimal comma while the user is still typing. */
export function formatRupiahInputText(value: string) {
  const comma = value.indexOf(",");
  const wholeDigits = (comma === -1 ? value : value.slice(0, comma)).replace(/\D/g, "");
  const fractionDigits = comma === -1 ? "" : value.slice(comma + 1).replace(/\D/g, "").slice(0, 4);
  const whole = rupiahIntegerInput.format(Number(wholeDigits || "0"));
  return comma === -1 ? whole : `${whole},${fractionDigits}`;
}

export type Formatters = ReturnType<typeof createFormatters>;

const cache = new Map<string, Formatters>();

export function getFormatters(intlLocale: string) {
  const cached = cache.get(intlLocale);
  if (cached) return cached;
  const created = createFormatters(intlLocale);
  cache.set(intlLocale, created);
  return created;
}

function createFormatters(intlLocale: string) {
  const amount = new Intl.NumberFormat(MONEY_LOCALE, { maximumFractionDigits: 0 });

  const amountCompact = new Intl.NumberFormat(MONEY_LOCALE, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const number = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 });

  /** "2 Mei" / "May 2" — no year, for column headers where the year is context. */
  const dayMonth = new Intl.DateTimeFormat(intlLocale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  /** "Mei" / "May" — the month band above a schedule grid. */
  const monthOnly = new Intl.DateTimeFormat(intlLocale, { month: "long", timeZone: "UTC" });

  /**
   * "23 Agu 2026, 21.22" / "Aug 23, 2026, 9:22 PM". No `timeZone` on purpose:
   * unlike the date-only formatters above, these are real instants and belong in
   * whatever zone the reader is sitting in.
   *
   * `hour: "numeric"`, not "2-digit": the padded form is right on Indonesian's
   * 24-hour clock but renders "09:22 PM" on English's 12-hour one, and a padded
   * 12-hour time is wrong in a way a reader notices.
   */
  const dateTime = new Intl.DateTimeFormat(intlLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  /** Keeps the minus outside the symbol: -Rp50.000, not Rp-50.000. */
  const withPrefix = (value: number, format: Intl.NumberFormat) =>
    `${value < 0 ? "-" : ""}${CURRENCY_PREFIX}${format.format(Math.abs(value))}`;

  /** Per-currency formatters, built on demand — see amountIn() below. */
  const foreign = new Map<string, Intl.NumberFormat>();

  return {
    /** `Rp100.000` — the default for tables and totals. */
    money(value: number) {
      return withPrefix(value, amount);
    },

    /** `Rp4,1 M` — compact, for stat tiles where width is tight. */
    moneyCompact(value: number) {
      return withPrefix(value, amountCompact);
    },

    /**
     * An amount in whatever currency the record itself names.
     *
     * money() above is rupiah by definition and hardcodes its prefix to dodge
     * Intl's non-breaking space. A reconciliation is different: it carries a
     * `currency` per ledger account, and a USD balance printed as `Rp1.250` is
     * not a formatting nit, it is the wrong number. So this is the one place
     * `style: "currency"` earns its keep — for anything but IDR the locale's own
     * symbol and placement are what a reader expects. IDR still routes through
     * the house prefix, so a rupiah figure looks identical on every screen.
     *
     * Values arrive as strings: these are Prisma Decimal(20,4) columns, and
     * round-tripping them through a float would round money.
     *
     * Memoized per currency for the same reason everything else here is. The
     * version this replaces lived in the reconciliations route and built a fresh
     * Intl.NumberFormat inside a table cell — once per row, per render.
     */
    amountIn(value: number | string | null | undefined, currency: string) {
      if (value === null || value === undefined) return "—";
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) return String(value);
      if (currency === "IDR" || currency === "") return withPrefix(parsed, amount);

      let format = foreign.get(currency);
      if (!format) {
        try {
          format = new Intl.NumberFormat(intlLocale, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          });
        } catch {
          // An unrecognised ISO code throws rather than degrading. Cache a plain
          // number formatter and print the code beside it, so the figure stays
          // readable and the next row does not throw again.
          const plain = new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 });
          foreign.set(currency, plain);
          return `${currency} ${plain.format(parsed)}`;
        }
        foreign.set(currency, format);
      }
      return format.format(parsed);
    },

    quantity(value: number, unit?: string | null) {
      const formatted = number.format(value);
      return unit ? `${formatted} ${unit}` : formatted;
    },

    percent(value: number | null | undefined) {
      return value === null || value === undefined ? "—" : `${Math.round(value)}%`;
    },

    /**
     * Date-only values, from `@db.Date` columns.
     *
     * They arrive in two shapes and both have to work: a plain "YYYY-MM-DD"
     * string, and a real Date once SvelteKit's serializer has revived one on
     * the client. A bare string is parsed as UTC rather than local, which is
     * what avoids the off-by-one where a browser behind UTC renders the
     * previous day; a Date is already at UTC midnight and is used as-is.
     */
    formatDate(value: string | Date | null | undefined) {
      if (!value) return "—";
      const date = value instanceof Date ? value : new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return "—";
      return date.toLocaleDateString(intlLocale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
    },

    /**
     * "2 – 9 Mei" / "May 2 – 9". `formatRange` is what collapses the repeated
     * month rather than printing it twice, and it does so per locale — the
     * Indonesian form puts the month last, so a hand-built "2 Mei – 9 Mei"
     * would be both longer and wrong.
     */
    formatDateRange(
      start: string | Date | null | undefined,
      end: string | Date | null | undefined,
    ) {
      if (!start || !end) return "—";
      const from = start instanceof Date ? start : new Date(`${start}T00:00:00Z`);
      const to = end instanceof Date ? end : new Date(`${end}T00:00:00Z`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "—";
      return dayMonth.formatRange(from, to);
    },

    /** The month a period sits in, from its "YYYY-MM" key. */
    formatMonthKey(monthKey: string) {
      const date = new Date(`${monthKey}-01T00:00:00Z`);
      return Number.isNaN(date.getTime()) ? monthKey : monthOnly.format(date);
    },

    /**
     * Timestamps (createdAt etc.) are full ISO strings; local time is correct.
     *
     * Carries the time of day, which is the whole reason to reach for this over
     * formatDate — an audit line that says only "23 Agu 2026" cannot tell you
     * which of the day's four approvals it refers to. It renders through an
     * Intl.DateTimeFormat rather than toLocaleDateString, which ignores `hour`
     * and `minute` outright.
     */
    formatDateTime(value: string | Date | null | undefined) {
      if (!value) return "—";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "—";
      return dateTime.format(date);
    },
  };
}
