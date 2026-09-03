# Tickmark Copilot for Excel

An Excel taskpane add-in (Office Add-in) with a tax agent for Indonesian
Coretax workflows. It reads the active sheet, runs deterministic Coretax
checks — NPWP format, PPN = 11% of DPP, duplicate invoice numbers, required
fields, invalid dates — and can answer free-text questions through Vercel AI
Gateway. Fixes are proposed with a cell reference and applied only when you
click **Apply**; the agent never writes to the workbook by itself.

## Run the demo

```sh
bun install
bun run dev
```

Then open **https://localhost:5174** in a browser. Without Office.js present
the pane runs in **Preview mode** against a sample Faktur Keluaran sheet
seeded with defects: a 5-digit NPWP, a PPN that is not 11% of DPP, a duplicate
invoice number, a missing DPP, and a 31 February date. Click the suggestion
chips or type a question.

The first `bun run dev` may ask (Windows UAC) to install the Office developer
CA — Office only loads taskpanes over HTTPS, even from localhost. Or install
it up front:

```sh
bunx office-addin-dev-certs install
```

## Use it in Excel

1. `bun run dev`
2. Excel → Insert → My Add-ins → Upload My Add-in (or the shared-folder
   catalog on Windows) → sideload `apps/addin/manifest.xml`
3. The pane opens on the right; the header badge reads **Excel** and the
   agent works on your real active sheet. **Refresh** re-reads it, **Apply**
   writes a suggested value into the referenced cell.

## Configuration

`apps/addin/.env.local` (gitignored):

| Variable | Purpose |
| --- | --- |
| `VITE_AI_GATEWAY_KEY` | Vercel AI Gateway key. Omit and the agent still runs all checks; only the free-text answers go away |
| `VITE_AI_MODEL` | Gateway model id. Default: `zai/glm-5.3-flash` |

The key ships to the browser by design — this pane has no server — so use a
disposable, demo-scoped key.

## Layout

```
apps/addin
├── manifest.xml          sideload manifest (points at https://localhost:5174)
├── public/icon-64.png
└── src
    ├── App.svelte        Office.onReady gate → Panel
    ├── components
    │   ├── Panel.svelte      sheet bar, thread, composer
    │   └── IssueList.svelte  findings with Apply buttons
    └── lib
        ├── office.ts     Office.js boundary + browser-preview mock sheet
        ├── agent.ts      deterministic Coretax checks + step timeline
        ├── ai.ts         optional Vercel AI Gateway call
        └── i18n.ts       EN/ID strings, locale from the browser
```

Shared UI primitives and the shadcn-style theme live in `packages/ui`
(consumed as source via Vite alias).
