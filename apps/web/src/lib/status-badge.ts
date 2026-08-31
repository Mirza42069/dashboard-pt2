import type { Dictionary } from "../i18n";

export type StatusKind = keyof Dictionary["status"];

/** Localized label for a status value — usable anywhere the dict is in scope. */
export function statusLabel(dict: Dictionary, kind: StatusKind, value: string): string {
  const labels = dict.status[kind] as Record<string, string>;
  return labels[value] ?? value;
}
