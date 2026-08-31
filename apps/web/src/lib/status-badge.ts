import type { Dictionary } from "../i18n";

export type StatusKind = keyof Dictionary["status"];

/**
 * Localized label for a status value — usable anywhere the dict is in scope.
 *
 * Lowercases before the lookup because the two ends disagree on case and only
 * one of them should have to care: Prisma enums reach the client as
 * `READY_FOR_REVIEW`, while the dictionary is keyed in lowercase like every
 * other section. Normalizing here means neither the API nor the translator has
 * to know about the other's convention, and it costs nothing for the kinds that
 * were already lowercase.
 *
 * An unknown value returns itself rather than throwing or rendering blank: a
 * status the dictionary has not caught up with should still be readable.
 */
export function statusLabel(dict: Dictionary, kind: StatusKind, value: string): string {
  const labels = dict.status[kind] as Record<string, string>;
  return labels[value.toLowerCase()] ?? value;
}
