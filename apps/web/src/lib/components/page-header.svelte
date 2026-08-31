<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * The one page header.
	 *
	 * Before this, the <h1> scale had forked in two with no rule behind it —
	 * `text-base` on the pages nobody had finished and `text-xl md:text-2xl` on
	 * the ones that shipped — so how important a page looked tracked how done it
	 * was rather than what it held. One component, one scale.
	 *
	 * The eyebrow is the only place --brand appears as type. It names the area of
	 * the product rather than the page, so it takes the brand colour and the
	 * caption size; the title carries the page itself.
	 *
	 * Four slots and no more. `meta` and `details` exist because a record header
	 * genuinely has three registers — what state it is in, what it is called, and
	 * how to identify it — and collapsing them into one string is what produced
	 * the hand-rolled header this replaces.
	 */
	let {
		eyebrow,
		title,
		subtitle,
		meta,
		details,
		actions
	}: {
		/** The area of the product this page belongs to. */
		eyebrow?: string;
		title: string;
		/** One sentence on what the page is for. */
		subtitle?: string;
		/** Status badges and the like, above the title. */
		meta?: Snippet;
		/** Identifiers under the title — an account code, a reference. */
		details?: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<header class="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
	<div class="min-w-0 max-w-3xl space-y-1">
		{#if meta}
			<div class="flex flex-wrap items-center gap-2 pb-1">{@render meta()}</div>
		{/if}
		{#if eyebrow}
			<p class="text-caption font-semibold tracking-[0.18em] text-brand uppercase">{eyebrow}</p>
		{/if}
		<h1 class="truncate text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
		{#if subtitle}
			<p class="text-sm text-muted-foreground">{subtitle}</p>
		{/if}
		{#if details}
			<p class="truncate font-mono text-xs text-muted-foreground">{@render details()}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</header>
