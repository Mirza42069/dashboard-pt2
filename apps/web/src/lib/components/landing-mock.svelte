<!--
	The product shot, drawn rather than screenshotted.

	A real capture goes stale the first time the grid is restyled, and the landing
	page is the one place the reader has no product to compare it against. This is
	built from the same tokens as the real thing, so it cannot drift in colour or
	type even when it drifts in layout.

	It shows the grid rather than the chat, because that is where the work
	happens — the agent is the rail beside it, not the product.

	Lives in its own file because the landing page it used to be inlined in is now
	a two-column layout, and a 110-line decoration wedged between the headline and
	the steps made the column's actual structure impossible to read.
-->
<script lang="ts">
	import { Check, Send, Sparkles } from '@DashboardPT2/ui/components/icons';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import { getT } from '../../i18n/context.svelte';

	let { class: className }: { class?: string } = $props();

	const t = getT();

	const demoColumns = ['TaxInvoiceDate', 'BuyerTIN', 'TaxBase'];

	/** The third row carries the flagged cell the agent is explaining. */
	const demoRows = [
		{ n: '3', cells: ['2026-08-01', '0012345678901000', '12.500.000'], flagged: -1 },
		{ n: '4', cells: ['2026-08-03', '0098765432109000', '890.000'], flagged: -1 },
		{ n: '5', cells: ['2026-08-05', '00987654321', '1.240.000'], flagged: 1 }
	];

	const demoSteps = $derived([
		t.agent.stepLabels.pulled_statement.replace('{lines}', '842'),
		t.agent.stepLabels.flagged_breaks.replace('{count}', '1')
	]);
</script>

<div
	class={cn('overflow-hidden rounded-xl border bg-card shadow-xl', className)}
	aria-hidden="true"
>
	<div class="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
		<span class="size-2 rounded-full bg-border"></span>
		<span class="size-2 rounded-full bg-border"></span>
		<span class="size-2 rounded-full bg-border"></span>
	</div>

	<div class="flex">
		<!-- The nav rail, reduced to its silhouette. -->
		<div class="hidden w-10 shrink-0 flex-col gap-1.5 bg-surface-shell p-2 sm:flex">
			<span class="h-4 rounded bg-brand/70"></span>
			<span class="h-2.5 rounded bg-foreground/10"></span>
			<span class="h-2.5 rounded bg-foreground/10"></span>
			<span class="h-2.5 rounded bg-foreground/10"></span>
		</div>

		<!-- The grid. -->
		<div class="min-w-0 flex-1 border-x">
			<div class="flex h-7 items-center border-b bg-background">
				<span class="grid h-full w-12 place-items-center border-r font-mono text-caption font-semibold">
					B5
				</span>
				<span class="grid h-full w-7 place-items-center border-r font-serif text-xs italic text-muted-foreground">
					fx
				</span>
				<span class="truncate px-2 font-mono text-xs">00987654321</span>
			</div>

			<table class="w-full border-collapse">
				<thead>
					<tr class="bg-surface-grid-header">
						<th class="w-10 border-r border-b px-1 py-1 text-center font-mono text-caption font-semibold">
							#
						</th>
						{#each demoColumns as column, index (column)}
							<th class="border-r border-b px-2 py-1 text-left">
								<span class="block text-center font-mono text-caption text-muted-foreground">
									{String.fromCharCode(65 + index)}
								</span>
								<span class="block truncate text-caption font-medium">{column}</span>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each demoRows as row (row.n)}
						<tr>
							<td class="h-row border-r border-b bg-surface-grid-header text-center font-mono text-caption text-muted-foreground tabular-nums">
								{row.n}
							</td>
							{#each row.cells as cell, index (cell)}
								<td
									class="relative h-row border-r border-b px-2 font-mono text-xs tabular-nums {row.flagged ===
									index
										? 'bg-destructive/5 ring-2 ring-brand ring-inset'
										: ''}"
								>
									<span class="block truncate">{cell}</span>
									{#if row.flagged === index}
										<span
											class="absolute top-0 right-0 size-0 border-t-4 border-r-4 border-t-destructive border-r-destructive"
										></span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- The agent rail, where it actually sits. -->
		<div class="hidden w-56 shrink-0 flex-col bg-surface-panel xl:flex">
			<div class="flex h-7 items-center gap-1.5 border-b px-2">
				<span class="grid size-4 place-items-center rounded bg-ink-strong text-background">
					<Sparkles class="size-2.5" />
				</span>
				<span class="text-caption font-semibold">{t.agentPanel.tabIssues}</span>
				<span class="ml-auto text-caption text-destructive tabular-nums">1</span>
			</div>
			<div class="space-y-2 p-2">
				<ol class="space-y-1 rounded-md border bg-background px-2 py-1.5">
					{#each demoSteps as step (step)}
						<li class="flex items-center gap-1.5 text-caption text-muted-foreground">
							<span class="grid size-3 shrink-0 place-items-center rounded-full bg-success/15 text-success">
								<Check class="size-2" />
							</span>
							<span class="truncate">{step}</span>
						</li>
					{/each}
				</ol>
				<div class="border-l-2 border-brand bg-brand/5 px-2 py-1.5">
					<p class="text-caption font-semibold tracking-wide text-brand uppercase">
						{t.workbook.suggestedFix}
					</p>
					<p class="mt-1 text-caption leading-4">INVALID_NITKU · 22 digits</p>
				</div>
			</div>
			<div class="mt-auto border-t p-2">
				<div class="flex items-center gap-1.5">
					<span class="h-6 flex-1 rounded-md border bg-background"></span>
					<span class="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
						<Send class="size-3" />
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
