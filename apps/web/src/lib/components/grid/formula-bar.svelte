<script lang="ts">
	import { getT } from '../../../i18n/context.svelte';

	let {
		address,
		value
	}: { address: string | null; value: string | null } = $props();

	const t = getT();
</script>

<!--
	The name box and value strip, as a spreadsheet has them.

	Read-only on purpose. Editing happens in the cell, and a second writable
	surface for the same value would need its own conflict story against
	patchCell's optimistic lock for no benefit — this exists so a truncated cell
	can still be read in full, and so the reader always knows where they are.
-->
<div class="flex h-7 shrink-0 items-center border-b border-border bg-background">
	<div
		class="grid h-full w-16 shrink-0 place-items-center border-r border-border font-mono text-caption font-semibold tabular-nums"
	>
		{address ?? '—'}
	</div>
	<div
		class="grid h-full w-8 shrink-0 place-items-center border-r border-border font-serif text-xs italic text-muted-foreground"
		aria-hidden="true"
	>
		fx
	</div>
	<div class="min-w-0 flex-1 truncate px-2 font-mono text-xs">
		{value || t.workbook.formulaHint}
	</div>
</div>
