import { GatewayError, hasModel, streamChat, type ChatMessage, type ToolCall } from "./gateway";
import { applyEdits, findTool, previewEdits, toolSchemas, type PendingEdit } from "./tools";

/**
 * The agent: a tool-calling loop over the workbook.
 *
 * It knows nothing about what any workbook contains. There is no vocabulary of
 * expected column names here, no rule about what a valid value looks like, no
 * assumption about the document being any particular kind of document — the
 * prompt below says so out loud, and the only way for the model to learn
 * anything is to call a tool and read what comes back.
 *
 * The conversation persists across turns on this instance, so a follow-up
 * ("now the same for column E") resolves against what the agent already saw
 * instead of starting from nothing.
 *
 * Writes suspend the loop. When the model calls a write tool the agent yields an
 * `approval` event carrying the diff and waits on `requestApproval`; whatever the
 * person decides is fed back as the tool result, so a declined edit is something
 * the model is told about and can respond to, not a silent no-op.
 */

const SYSTEM = [
  "You are the assistant in a Microsoft Excel task pane. You are talking to the person who has this workbook open in front of them.",
  "",
  "You cannot see the workbook. Calling tools is the only way to learn anything about it. Before you state any fact about the data, call a tool and read the result. Never guess or invent a cell value, a header, a sheet name, a total, or a row count.",
  "",
  "How to work:",
  "- If you do not know what you are looking at, start with list_sheets, or get_selection when the person says 'this', 'here' or 'the selection'.",
  "- read_used_range is the quickest way to see a whole sheet. read_range is for when you already know the address.",
  "- Tool results are capped in size. If one comes back with truncated set to true, read further ranges rather than assuming you saw everything.",
  "- Work out what the columns mean from the sheet itself — the header row, the values, the formulas. Do not assume a sheet is any particular kind of document.",
  "- Cite cell references when you state a fact, in A1 form: B7, or Sheet2!B7 when the sheet is not obvious.",
  "",
  "Changing the workbook:",
  "- Use write_cells for literal values and write_formula for formulas.",
  "- Every edit needs the person's approval before it reaches the workbook. Say what you are about to change and why before you propose it.",
  "- If a write comes back with applied set to false, they declined. Acknowledge that and move on. Do not propose the same edit again unless they ask.",
  "",
  "If a tool returns an error, say what failed and what you would need instead. Never describe a failed call as if it succeeded.",
  "",
  "Reply in the language the person wrote to you in. Keep answers short and concrete — this is a narrow side panel, not a report.",
].join("\n");

/** How many tool rounds before the agent is made to answer with what it has. */
const MAX_ROUNDS = 8;

export type ApprovalRequest = {
  id: string;
  tool: string;
  edits: PendingEdit[];
};

export type AgentEvent =
  | { type: "reasoning"; delta: string }
  | { type: "text"; delta: string }
  | { type: "tool_start"; id: string; name: string; label: string; args: unknown }
  | { type: "tool_end"; id: string; ok: boolean; summary: string; detail: string }
  | { type: "approval_end"; id: string; applied: boolean }
  | { type: "error"; message: string };

export type Decision = "apply" | "discard";

/** Trim a tool result to something worth spending context on. */
function serializeResult(value: unknown): string {
  const text = JSON.stringify(value ?? null);
  return text.length > 12_000 ? `${text.slice(0, 12_000)}…` : text;
}

export class Agent {
  private messages: ChatMessage[] = [{ role: "system", content: SYSTEM }];

  reset(): void {
    this.messages = [{ role: "system", content: SYSTEM }];
  }

  get hasModel(): boolean {
    return hasModel();
  }

  async *send(
    userText: string,
    options: {
      signal: AbortSignal;
      requestApproval: (request: ApprovalRequest) => Promise<Decision>;
    },
  ): AsyncGenerator<AgentEvent> {
    this.messages.push({ role: "user", content: userText });

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const lastRound = round === MAX_ROUNDS - 1;
      let text = "";
      let calls: ToolCall[] = [];

      try {
        for await (const event of streamChat({
          messages: this.messages,
          // On the final round the tools are withheld, which is what forces a
          // written answer instead of a ninth call into the same loop.
          tools: lastRound ? undefined : toolSchemas(),
          signal: options.signal,
        })) {
          if (event.type === "reasoning") yield { type: "reasoning", delta: event.delta };
          else if (event.type === "text") {
            text += event.delta;
            yield { type: "text", delta: event.delta };
          } else if (event.type === "tool_calls") calls = event.calls;
        }
      } catch (error) {
        const message =
          error instanceof GatewayError ? error.message : `unexpected: ${String(error)}`;
        yield { type: "error", message };
        return;
      }

      if (options.signal.aborted) {
        // Keep the partial answer in history so a follow-up still makes sense.
        this.messages.push({ role: "assistant", content: text });
        return;
      }

      this.messages.push({
        role: "assistant",
        content: text,
        ...(calls.length > 0 ? { tool_calls: calls } : {}),
      });

      if (calls.length === 0) return;

      for (const call of calls) {
        const name = call.function.name;
        const spec = findTool(name);

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          // Fall through with empty args; the tool reports what it needed.
        }

        if (!spec) {
          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: `No tool named ${name}.` }),
          });
          continue;
        }

        if (spec.write) {
          let edits: PendingEdit[];
          try {
            edits = await previewEdits(name, args);
          } catch (error) {
            const message = String(error instanceof Error ? error.message : error);
            yield { type: "tool_start", id: call.id, name, label: spec.label(args), args };
            yield { type: "tool_end", id: call.id, ok: false, summary: message, detail: "" };
            this.messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify({ applied: false, error: message }),
            });
            continue;
          }

          const decision = await options.requestApproval({ id: call.id, tool: name, edits });
          const applied = decision === "apply";

          let failure: string | null = null;
          if (applied) {
            try {
              await applyEdits(edits);
            } catch (error) {
              failure = String(error instanceof Error ? error.message : error);
            }
          }

          yield { type: "approval_end", id: call.id, applied: applied && !failure };
          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(
              failure
                ? { applied: false, error: failure }
                : applied
                  ? { applied: true, cells: edits.map((edit) => edit.ref) }
                  : { applied: false, reason: "The person declined this edit." },
            ),
          });
          continue;
        }

        yield { type: "tool_start", id: call.id, name, label: spec.label(args), args };
        try {
          const result = await spec.run?.(args);
          const detail = serializeResult(result);
          yield {
            type: "tool_end",
            id: call.id,
            ok: true,
            summary: spec.summary?.(result) ?? "",
            detail,
          };
          this.messages.push({ role: "tool", tool_call_id: call.id, content: detail });
        } catch (error) {
          const message = String(error instanceof Error ? error.message : error);
          yield { type: "tool_end", id: call.id, ok: false, summary: message, detail: "" };
          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({ error: message }),
          });
        }
      }
    }
  }
}
