import { getContext, setContext } from "svelte";

import {
  DEFAULT_LOCALE,
  getDictionary,
  INTL_LOCALE,
  LOCALE_COOKIE,
  type Dictionary,
  type Locale,
} from "./index";

const KEY = Symbol("i18n");

type I18n = {
  readonly locale: Locale;
  readonly intlLocale: string;
  readonly dict: Dictionary;
};

/**
 * Set once in the root layout from the locale hooks.server.ts read off the
 * cookie. The React template used a context provider for the same job; the only
 * difference here is that the value is a getter object, so a locale change that
 * did not reload would still propagate.
 */
export function setI18n(getLocale: () => Locale) {
  setContext<I18n>(KEY, {
    get locale() {
      return getLocale();
    },
    get intlLocale() {
      return INTL_LOCALE[getLocale()];
    },
    get dict() {
      return getDictionary(getLocale());
    },
  });
}

function i18n(): I18n {
  return (
    getContext<I18n | undefined>(KEY) ?? {
      locale: DEFAULT_LOCALE,
      intlLocale: INTL_LOCALE[DEFAULT_LOCALE],
      dict: getDictionary(DEFAULT_LOCALE),
    }
  );
}

/**
 * The whole typed dictionary. Replaces the template's `useT()` one-for-one:
 * `const t = getT(); t.nav.reconciliations`.
 *
 * Returns the context object's `dict` getter result, so callers holding `t`
 * across a locale change see the new strings.
 */
export function getT(): Dictionary {
  return i18n().dict;
}

export function getLocaleState() {
  return i18n();
}

/**
 * Writes the cookie and hard-reloads. Re-running the load functions would
 * re-render server data but leave already-mounted client state (open dialogs,
 * cached formatter instances) in the old language; a reload guarantees
 * consistency, and language switching is rare enough that the cost is
 * irrelevant.
 */
export function setLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  window.location.reload();
}
