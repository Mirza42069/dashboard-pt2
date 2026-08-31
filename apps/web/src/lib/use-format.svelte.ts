import { getLocaleState } from "../i18n/context.svelte";

import { getFormatters } from "./format";

/**
 * Formatters bound to the active locale. The single way components format
 * money, quantities and dates — never instantiate Intl formatters in a
 * component.
 */
export function useFormat() {
  return getFormatters(getLocaleState().intlLocale);
}
