<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import {
		CircleCheck,
		Loader2,
		Lock,
		MousePointerClick,
		Sparkles,
		TriangleAlert
	} from '@DashboardPT2/ui/components/icons';
	import { createQuery } from '@tanstack/svelte-query';

	import { interpolate } from '../../../i18n';
	import { getT } from '../../../i18n/context.svelte';
	import { client } from '../../orpc';
	import {
		focusInspectorIssue,
		type InspectorIssue,
		type WorkbookInspector
	} from '../../workbook-inspector.svelte';

	let { inspector }: { inspector: WorkbookInspector } = $props();

	const t = getT();

	const selected = $derived(inspector.selected);
	const issue = $derived(selected?.issue ?? null);

	/**
	 * A query rather than an imperative call, so the same issue explained twice
	 * is served from cache instead of re-asking. `explainIssue` is a pure lookup
	 * over a persisted validation issue — it cannot change between two reads of
	 * the same id, which is exactly the shape a cache wants.
	 */
	const explanation = createQuery(() => ({
		queryKey: ['coretax', 'explain', inspector.batchId, issue?.id],
		queryFn: () =>
			client.importBatch.explainIssue({
				importBatchId: inspector.batchId,
				issueId: issue!.id
			}),
		enabled: Boolean(issue?.id),
		staleTime: Infinity
	}));
</script>

<div class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto p-3">
		{#if selected}
			<div class="rounded-md border border-border bg-background p-2.5">
				<div class="flex items-center justify-between gap-2">
					<span class="font-mono text-caption font-semibold text-brand">{selected.address}</span>
					<span class="truncate font-mono text-caption text-muted-foreground">
						{selected.fieldKey}
					</span>
				</div>
				<p class="mt-1.5 break-words font-mono text-xs">
					{selected.value || t.workbook.emptyCell}
				</p>
			</div>
		{:else}
			<div class="rounded-md border border-dashed border-border p-4 text-center">
				<MousePointerClick class="mx-auto size-4 text-muted-foreground" />
				<p class="mt-2 text-xs font-medium">{t.workbook.selectCell}</p>
			</div>
		{/if}

		{#if issue}
			{#if explanation.isPending}
				<div class="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
					<Loader2 class="size-3.5 animate-spin" />
					{t.workbook.readingRule}
				</div>
			{:else if explanation.data}
				<div class="mt-3 space-y-2.5">
					<div class="flex gap-2">
						<span
							class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ink-strong text-background"
						>
							<Sparkles class="size-3" />
						</span>
						<div class="min-w-0">
							<p class="text-xs font-semibold">{explanation.data.title}</p>
							<p class="mt-1 text-xs leading-5 text-muted-foreground">
								{explanation.data.explanation}
							</p>
						</div>
					</div>
					<div class="border-l-2 border-brand bg-brand/5 px-3 py-2">
						<p class="flex items-center gap-1.5 text-caption font-semibold tracking-wide text-brand uppercase">
							{t.workbook.suggestedFix}
							<!--
								A suggestion is read-only — it never touches the workbook. That
								is a property of the thing, not a lesson, so it rides on the
								heading as a lock and a tooltip instead of a standing sentence
								repeated under every explanation.
							-->
							<span
								class="inline-flex"
								role="img"
								title={t.workbook.readOnlyNote}
								aria-label={t.workbook.readOnlyNote}
							>
								<Lock class="size-3 text-brand/60" />
							</span>
						</p>
						<p class="mt-1 text-xs leading-5">{explanation.data.suggestion}</p>
					</div>
				</div>
			{/if}
		{:else if selected}
			<div class="mt-3 flex gap-2 rounded-md bg-success/10 p-2.5 text-success">
				<CircleCheck class="mt-0.5 size-3.5 shrink-0" />
				<p class="text-xs leading-4">{t.workbook.noIssueOnCell}</p>
			</div>
		{/if}

		<div class="mt-5 border-t border-border pt-3">
			<div class="flex items-center justify-between">
				<p class="text-caption font-semibold tracking-wide text-muted-foreground uppercase">
					{t.workbook.issuesOnPage}
				</p>
				<span
					class="font-mono text-caption tabular-nums {inspector.issues.length
						? 'text-destructive'
						: 'text-success'}"
				>
					{inspector.issues.length}
				</span>
			</div>

			{#if inspector.issues.length > 0}
				<ul class="mt-2 space-y-1">
					{#each inspector.issues as item (item.id)}
						<li>
							<button
								type="button"
								onclick={() => focusInspectorIssue(item)}
								aria-current={item.id === issue?.id ? 'true' : undefined}
								class="flex w-full items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left transition-colors hover:border-destructive/30 hover:bg-destructive/5 aria-[current]:border-destructive/40 aria-[current]:bg-destructive/5"
							>
								<TriangleAlert class="mt-0.5 size-3 shrink-0 text-destructive" />
								<span class="min-w-0 flex-1">
									<span class="block truncate font-mono text-caption">{item.fieldKey}</span>
									<span class="block truncate text-caption text-muted-foreground">
										{item.locator} · {item.code}
									</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	<div class="shrink-0 border-t border-border px-3 py-2">
		<p class="truncate text-caption text-muted-foreground">
			{interpolate(t.workbook.agentContext, { context: inspector.documentLabel })}
		</p>
	</div>
</div>
