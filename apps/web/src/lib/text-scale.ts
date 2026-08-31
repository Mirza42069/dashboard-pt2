import { APP_COOKIES } from "@DashboardPT2/api/lib/cookies";

export const TEXT_SCALES = ["normal", "large"] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const DEFAULT_TEXT_SCALE: TextScale = "large";
export const TEXT_SCALE_COOKIE = APP_COOKIES.textScale;

/**
 * The class the "large" scale puts on <html>. The rule behind it lives in
 * packages/ui/src/styles/globals.css and is a single font-size declaration —
 * see there for why that is enough to resize the whole product.
 *
 * Named outside Tailwind's namespace on purpose. The obvious `text-scale-lg`
 * is a trap: tailwind-merge reads any unrecognised `text-*` class as a text
 * colour, so `cn("text-scale-lg", "text-red-500")` silently drops the scale.
 * This class rides along with app classes through cn(), so it has to be one
 * that no utility can ever be mistaken for.
 */
export const TEXT_SCALE_CLASS: Record<TextScale, string> = {
  normal: "",
  large: "a11y-large-text",
};

export function isTextScale(value: unknown): value is TextScale {
  return typeof value === "string" && (TEXT_SCALES as readonly string[]).includes(value);
}

/**
 * Read server-side and stamped onto <html>, the same way the theme and locale
 * are. Doing it from a cookie rather than localStorage is what keeps the page
 * from rendering at one size and then jumping to another once a client effect
 * runs — for someone who needs the large setting, that first unreadable paint
 * is precisely the thing being fixed.
 */
export function resolveTextScale(value: string | undefined): TextScale {
  return isTextScale(value) ? value : DEFAULT_TEXT_SCALE;
}

export function setTextScaleCookie(scale: TextScale) {
  document.cookie = `${TEXT_SCALE_COOKIE}=${scale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
