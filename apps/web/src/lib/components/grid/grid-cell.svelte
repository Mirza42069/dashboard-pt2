<script lang="ts">
	import * as Table from '@DashboardPT2/ui/components/table';
	import { cn } from '@DashboardPT2/ui/lib/utils';

	import type { GridCell } from './types';

	let {
		cell,
		selected,
		editing,
		draft = $bindable(''),
		onSelect,
		onBeginEdit,
		onCommit,
		onCancel
	}: {
		cell: GridCell;
		selected: boolean;
		editing: boolean;
		draft?: string;
		onSelect: () => void;
		onBeginEdit: () => void;
		onCommit: (value: string) => void;
		onCancel: () => void;
	} = $props();

	let input = $state<HTMLInputElement | null>(null);
	let host = $state<HTMLTableCellElement | null>(null);

	/**
	 * Focus follows the model, not the other way round.
	 *
	 * The grid owns which cell is current; this moves the browser's focus to
	 * match whenever that changes. Doing it the other way — letting focus events
	 * drive selection — means arrow keys have to fight the browser's own
	 * tab order, and the header's sticky cells steal focus on the way past.
	 */
	$effect(() => {
		if (editing) {
			input?.focus();
			input?.select();
		} else if (selected) {
			// Only when it is not already inside, or clicking a cell would rip focus
			// back to the <td> and cancel the click.
			if (host && !host.contains(document.activeElement)) host.focus();
		}
	});
</script>

<Table.Cell
	bind:ref={host}
	role="gridcell"
	tabindex={selected ? 0 : -1}
	aria-selected={selected}
	aria-invalid={cell.issue ? 'true' : undefined}
	onmousedown={(event) => {
		// Keeps the click from focusing the <td> before the model has moved,
		// which would otherwise fire the effect above with the old position.
		if (!editing) event.preventDefault();
		onSelect();
	}}
	ondblclick={onBeginEdit}
	class={cn(
		'relative h-row border-r border-b border-border p-0 align-middle outline-none',
		cell.issue && 'bg-destructive/5',
		selected && 'z-10 ring-2 ring-brand ring-inset'
	)}
>
	{#if editing}
		<input
			bind:this={input}
			bind:value={draft}
			onblur={() => onCommit(draft)}
			onkeydown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					onCancel();
				}
			}}
			class="h-full w-full bg-background px-cell-x font-mono text-xs outline-none"
		/>
	{:else}
		<span class="block truncate px-cell-x font-mono text-xs">{cell.value}</span>
	{/if}

	{#if cell.issue}
		<!--
			The corner triangle, as Excel draws it. Purely decorative: the cell
			already carries aria-invalid, and the issue itself is listed in the
			agent panel where it can be read and acted on.
		-->
		<span
			aria-hidden="true"
			class="pointer-events-none absolute top-0 right-0 size-0 border-t-4 border-r-4 border-t-destructive border-r-destructive"
		></span>
	{/if}
</Table.Cell>
