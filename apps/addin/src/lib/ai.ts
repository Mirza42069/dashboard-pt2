import type { AddinIssue, SheetInput } from "./agent";
import type { Locale } from "./i18n";

/**
 * The optional LLM pass, called straight from the browser.
 *
 * The key lives in a gitignored local env and is demo-scoped on purpose — this
 * pane has no server of its own anymore. Anything that goes wrong (no key, a
 * CORS refusal, a timeout, an empty answer) resolves to null and the caller
 * labels the turn as checks-only instead of failing.
 */

const KEY = import.meta.env.VITE_AI_GATEWAY_KEY as string | undefined;
const MODEL = import.meta.env.VITE_AI_MODEL ?? "zai/glm-5.3-flash";

const EXCERPT_ROWS = 20;
const EXCERPT_ISSUES = 30;

export async function consultModel(input: {
  question: string;
  sheet: SheetInput;
  locale: Locale;
  issues: AddinIssue[];
}): Promise<string | null> {
  if (!KEY) return null;

  const excerpt = {
    sheet: input.sheet.name,
    headers: input.sheet.headers,
    rows: input.sheet.rows.slice(0, EXCERPT_ROWS),
    rowsTotal: input.sheet.rows.length,
    issues: input.issues.slice(0, EXCERPT_ISSUES),
  };

  const language = input.locale === "id" ? "Indonesian" : "English";
  const system = [
    "You are Tickmark, a tax assistant embedded in Excel for Indonesian Coretax workflows (Faktur Keluaran, BPPU).",
    `Answer strictly in ${language}, at most 120 words.`,
    "Use only the sheet excerpt and validation results provided; never invent figures.",
    "If the user asks something the excerpt cannot answer, say what extra data you would need.",
    'Respond as JSON: {"answer": string}.',
  ].join(" ");

  const user = [
    `The user asks: ${input.question}`,
    "Sheet excerpt (first 20 rows) and validation results follow as JSON:",
    JSON.stringify(excerpt),
  ].join("\n\n");

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        // glm-5.3-flash is a reasoning model — the reasoning tokens come out of
        // this budget before the answer does, so small budgets truncate empty.
        max_tokens: 1_500,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    try {
      const parsed = JSON.parse(content) as { answer?: string };
      return typeof parsed.answer === "string" && parsed.answer.trim()
        ? parsed.answer.trim()
        : null;
    } catch {
      return content;
    }
  } catch {
    return null;
  }
}
