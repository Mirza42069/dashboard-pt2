# Tickmark for Excel

An Excel taskpane add-in (Office Add-in) with an agent that works on whatever
workbook you have open.

The agent starts with **no knowledge of your data**. It has no list of expected
column names, no rules about what a valid value looks like, and no assumption
that the sheet is any particular kind of document. The only way it can learn
anything is to call a tool and read the result — list the sheets, read a range,
read your selection, search for a value. It works the sheet out from what comes
back, and cites the cells it is talking about.

It can change the workbook too, but never on its own: a write is shown as a diff
(`F7: 250 → =D7*E7`) and reaches Excel only when you click **Apply**. If you
discard it, the agent is told you declined and moves on.

## Run the demo

```sh
bun install
bun run dev
```

Then open **https://localhost:5174** in a browser. Without Office.js present the
pane runs in **Preview mode** against a small two-sheet sample workbook, so the
whole agent is demonstrable before anything is sideloaded.

The first `bun run dev` may ask (Windows UAC) to install the Office developer
CA — Office only loads taskpanes over HTTPS, even from localhost. Or install it
up front:

```sh
bunx office-addin-dev-certs install
```

## Use it in Excel

1. `bun run dev`
2. Excel → Insert → My Add-ins → Upload My Add-in (or the shared-folder catalog
   on Windows) → sideload `apps/addin/manifest.xml`
3. The pane opens on the right and the header badge reads **Excel**. The agent
   now works on your real workbook; **Apply** writes an approved edit into the
   referenced cell.

Everything the agent does stays inside ExcelApi 1.1, which is what the manifest
requires — no newer requirement set is needed.

## What the agent can do

| Tool | |
| --- | --- |
| `list_sheets` | Every worksheet, its used range and size, which is active |
| `read_used_range` | Everything a sheet uses, as values |
| `read_range` | A specific A1 range, optionally with formulas |
| `get_selection` | Whatever you have selected right now |
| `find_cells` | Substring search across one sheet or the workbook |
| `write_cells` | Propose literal values — **needs your approval** |
| `write_formula` | Propose a formula — **needs your approval** |

Read results are capped (200 rows × 40 columns) and flagged `truncated`, so the
agent reads further rather than assuming it saw everything.

## Configuration

`apps/addin/.env` (gitignored):

| Variable | Purpose |
| --- | --- |
| `VITE_AI_GATEWAY_KEY` | Vercel AI Gateway key. Without it the pane says so instead of failing mid-turn |
| `VITE_AI_MODEL` | Gateway model id. Default: `zai/glm-5.3-flash` |

The key ships to the browser by design — this pane has no server, and the
gateway allows the request from the pane's origin — so use a disposable,
demo-scoped key.

## Layout

```
apps/addin
├── manifest.xml          sideload manifest (points at https://localhost:5174)
├── public/icon-64.png
└── src
    ├── App.svelte        Office.onReady gate → Panel
    ├── components
    │   ├── Panel.svelte     sheet bar, thread, composer
    │   └── EditList.svelte  proposed edits with Apply / Discard
    └── lib
        ├── office.ts     Office.js boundary + the browser-preview workbook
        ├── gateway.ts    streaming OpenAI-compatible client
        ├── tools.ts      the tool registry and the edit preview
        ├── agent.ts      the tool-calling loop and the system prompt
        └── i18n.ts       EN/ID chrome strings, locale from the browser
```

Shared UI primitives and the theme live in `packages/ui` (consumed as source via
a Vite alias).
