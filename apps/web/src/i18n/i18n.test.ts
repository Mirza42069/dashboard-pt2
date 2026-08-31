import { matchIntent } from "@DashboardPT2/api/lib/agent-script";
import { describe, expect, test } from "bun:test";

import { en } from "./en";
import { id } from "./id";

/**
 * `as const satisfies Dictionary` already makes a missing or extra key a compile
 * error, so nothing here re-checks the shape. What it cannot see is what is
 * *inside* a string: a translator who drops `{count}` produces a perfectly
 * well-typed dictionary that prints a literal brace to the user, and a key left
 * on its English source is equally invisible to the type system.
 */

type Node = string | { readonly [key: string]: Node };

/** Every leaf, keyed by its dotted path — `projects.deleteTitle`, and so on. */
function leaves(node: Node, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  return Object.entries(node).flatMap(([key, child]) =>
    leaves(child, path ? `${path}.${key}` : key),
  );
}

const enLeaves = leaves(en as Node);
const idLeaves = new Map(leaves(id as Node));

/** `"Hapus {count} item?"` -> `["{count}"]`, sorted so order cannot matter. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[0]).sort();
}

describe("the Indonesian dictionary", () => {
  test("carries every placeholder its English source does", () => {
    const mismatched = enLeaves
      .filter(([path, source]) => {
        const translated = idLeaves.get(path);
        return (
          translated !== undefined &&
          placeholders(source).join() !== placeholders(translated).join()
        );
      })
      .map(([path]) => path);

    expect(mismatched).toEqual([]);
  });

  test("has no empty or whitespace-only string", () => {
    const blank = [...idLeaves.entries()]
      .filter(([, value]) => value.trim() === "")
      .map(([path]) => path);

    expect(blank).toEqual([]);
  });

  /**
   * Some keys are legitimately identical across locales — proper nouns, the
   * language names in the switcher, an em dash standing in for "no value". Every
   * other match is a key that was never translated, so the allow-list is the
   * whole test: it has to be added to deliberately.
   */
  const SHARED_WITH_ENGLISH = new Set([
    "common.none", // an em dash, standing in for "no value"
    "auth.email", // loanwords and acronyms Indonesian took whole
    "users.email",
    "actions.typeRfi",
    "users.statusColumn",
    "workbooks.colStatus",
    "imports.colStatus",
    "imports.colFormat",
    "settings.textSizeNormal",
    "settings.english", // the switcher names each language in itself
    "settings.indonesian",
    "users.roleAdmin", // role names, which the product treats as proper nouns
    "users.roleSuperAdmin",
    // DJP's own names for its forms and files. Translating "Faktur Keluaran"
    // into English would be wrong in the English UI too — it is what the
    // document is called, in the only language the tax office issues it in.
    "workbook.fakturLabel",
    "workbook.fakturDetail",
    "workbook.bppuLabel",
    "workbook.bppuDetail",
    "workbook.downloadXlsx",
    "workbook.version", // pure format strings, nothing to translate
    "actions.fromTo",
  ]);

  test("does not leave a key on its English source", () => {
    const untranslated = enLeaves
      .filter(
        ([path, source]) =>
          !SHARED_WITH_ENGLISH.has(path) && idLeaves.get(path) === source,
      )
      .map(([path]) => path);

    expect(untranslated).toEqual([]);
  });
});

/**
 * The agent panel's suggestion chips are prompts, not labels.
 *
 * Tapping one sends its text to the server, where an ordered regex table
 * (MATCHERS in packages/api/src/lib/agent-script.ts) decides which work to run.
 * The chips and that table are therefore coupled across two packages and two
 * languages, with nothing in the type system holding them together: a chip can
 * be reworded into perfectly good prose that matches no pattern at all, and the
 * only symptom is the agent answering a suggested question with "here is what I
 * can do instead".
 *
 * So this asserts the coupling directly. It is the reason the dictionary entries
 * carry a comment telling translators which word has to survive.
 */
describe("the agent suggestion chips", () => {
  const EXPECTED = {
    suggestReconcile: "reconcile_account",
    suggestExceptions: "open_exceptions",
    suggestStatus: "close_status",
    suggestLarge: "large_items",
  } as const;

  for (const [locale, dict] of [
    ["en", en],
    ["id", id],
  ] as const) {
    for (const [key, intent] of Object.entries(EXPECTED)) {
      test(`${locale}: "${key}" still reaches ${intent}`, () => {
        const prompt = (dict.chat as Record<string, string>)[key];
        expect(matchIntent(prompt)).toBe(intent);
      });
    }
  }
});
