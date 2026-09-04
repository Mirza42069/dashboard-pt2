/**
 * The model connection: a small OpenAI-compatible streaming client.
 *
 * The pane has no server of its own, so it talks to Vercel AI Gateway straight
 * from the browser. That works because the gateway answers the preflight with
 * `Access-Control-Allow-Origin` for the pane's origin and allows the
 * `authorization` header — verified against the live endpoint, along with
 * streamed tool calls, before any of this was written.
 *
 * The key therefore ships to the client by design. It is demo-scoped on
 * purpose; see the note in `.env`.
 */

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type StreamEvent =
  /** Chain-of-thought tokens. The gateway sends these on their own field. */
  | { type: "reasoning"; delta: string }
  | { type: "text"; delta: string }
  /** Emitted once, after the stream closes, with every call fully assembled. */
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "done"; finishReason: string };

const KEY = import.meta.env.VITE_AI_GATEWAY_KEY as string | undefined;

export const MODEL = (import.meta.env.VITE_AI_MODEL as string | undefined) ?? "zai/glm-5.3-flash";

const ENDPOINT = "https://ai-gateway.vercel.sh/v1/chat/completions";

/** False when no key is configured — the pane says so instead of failing mid-turn. */
export function hasModel(): boolean {
  return Boolean(KEY);
}

export class GatewayError extends Error {}

type Delta = {
  content?: string | null;
  reasoning?: string | null;
  tool_calls?: {
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }[];
};

/**
 * One streamed completion.
 *
 * Tool calls arrive fragmented — the first frame carries `index`, `id` and the
 * function name, then `arguments` dribbles in across later frames — so they are
 * accumulated by index here and surfaced once, whole, when the stream ends. The
 * caller never has to reason about partial JSON.
 */
export async function* streamChat(input: {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  signal?: AbortSignal;
}): AsyncGenerator<StreamEvent> {
  if (!KEY) throw new GatewayError("no-key");

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        messages: input.messages,
        ...(input.tools?.length ? { tools: input.tools, tool_choice: "auto" } : {}),
        // Reasoning models spend this budget on thinking before the answer
        // starts, so a small cap truncates to an empty message rather than a
        // short one.
        max_tokens: 4_000,
        temperature: 0.2,
      }),
      signal: input.signal,
    });
  } catch (error) {
    if (input.signal?.aborted) return;
    throw new GatewayError(`network: ${String(error)}`);
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new GatewayError(`${response.status} ${detail.slice(0, 300)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const pending = new Map<number, { id: string; name: string; args: string }>();
  let finishReason = "stop";
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; a frame may span reads.
      let split = buffer.indexOf("\n\n");
      while (split !== -1) {
        const frame = buffer.slice(0, split);
        buffer = buffer.slice(split + 2);
        split = buffer.indexOf("\n\n");

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;

          let parsed: {
            choices?: { delta?: Delta; finish_reason?: string | null }[];
          };
          try {
            parsed = JSON.parse(payload);
          } catch {
            continue; // A malformed frame is not worth killing the turn over.
          }

          const choice = parsed.choices?.[0];
          if (!choice) continue;
          if (choice.finish_reason) finishReason = choice.finish_reason;

          const delta = choice.delta;
          if (!delta) continue;

          if (delta.reasoning) yield { type: "reasoning", delta: delta.reasoning };
          if (delta.content) yield { type: "text", delta: delta.content };

          for (const call of delta.tool_calls ?? []) {
            const slot = pending.get(call.index) ?? { id: "", name: "", args: "" };
            if (call.id) slot.id = call.id;
            if (call.function?.name) slot.name = call.function.name;
            if (call.function?.arguments) slot.args += call.function.arguments;
            pending.set(call.index, slot);
          }
        }
      }
    }
  } catch (error) {
    // An abort surfaces here as a DOMException; the caller asked for it.
    if (input.signal?.aborted) return;
    throw new GatewayError(`stream: ${String(error)}`);
  } finally {
    reader.cancel().catch(() => {});
  }

  if (pending.size > 0) {
    const calls: ToolCall[] = [...pending.entries()]
      .sort(([a], [b]) => a - b)
      .map(([index, slot]) => ({
        id: slot.id || `call_${String(index)}`,
        type: "function" as const,
        function: { name: slot.name, arguments: slot.args || "{}" },
      }));
    yield { type: "tool_calls", calls };
  }

  yield { type: "done", finishReason };
}
