<script lang="ts">
	import * as Table from '@DashboardPT2/ui/components/table';

	import { columnName } from './column-name';
	import GridCell from './grid-cell.svelte';
	import type { GridColumn, GridPosition, GridRow } from './types';

	let {
		columns,
		rows,
		position = $bindable<GridPosition>({ row: 0, col: 0 }),
		onCommit
	}: {
		columns: GridColumn[];
		rows: GridRow[];
		position?: GridPosition;
		/** Resolves false if the write was rejected, so the cell can fall back. */
		onCommit: (row: GridRow, fieldKey: string, value: string) => void;
	} = $props();

	let editing = $state(false);
	let draft = $state('');

	const current = $derived(rows[position.row]?.cells[position.col] ?? null);

	/**
	 * A page change can leave the cursor past the end of the new page, and a
	 * narrower document type can leave it past the last column. Clamping here
	 * rather than at every caller means the grid cannot be handed a position it
	 * has no cell for.
	 */
	$effect(() => {
		const maxRow = Math.max(0, rows.length - 1);
		const maxCol = Math.max(0, columns.length - 1);
		if (position.row > maxRow || position.col > maxCol) {
			position = { row: Math.min(position.row, maxRow), col: Math.min(position.col, maxCol) };
		}
	});

	function move(rowDelta: number, colDelta: number) {
		if (rows.length === 0 || columns.length === 0) return;
		commitIfEditing();
		position = {
			row: Math.min(Math.max(0, position.row + rowDelta), rows.length - 1),
			col: Math.min(Math.max(0, position.col + colDelta), columns.length - 1)
		};
	}

	function beginEdit(seed?: string) {
		if (!current) return;
		draft = seed ?? current.value;
		editing = true;
	}

	function commitIfEditing() {
		if (!editing) return;
		const row = rows[position.row];
		const cell = row?.cells[position.col];
		editing = false;
		// Unchanged text is not a write. patchCell bumps the batch's dataVersion
		// on every call, and a no-op edit that invalidates everyone else's
		// expectedDataVersion is a conflict manufactured out of nothing.
		if (row && cell && draft !== cell.value) onCommit(row, cell.fieldKey, draft);
	}

	function cancelEdit() {
		editing = false;
		draft = '';
	}

	/**
	 * The whole keyboard contract, in one place.
	 *
	 * It lives on the container rather than on each cell because the behaviour is
	 * about the grid — where the cursor may go, what wraps, what commits — and
	 * 850 cells each carrying a copy of it is 850 chances for one to drift.
	 */
	function onkeydown(event: KeyboardEvent) {
		if (rows.length === 0) return;

		if (editing) {
			if (event.key === 'Enter') {
				event.preventDefault();
				commitIfEditing();
				move(1, 0);
			} else if (event.key === 'Tab') {
				event.preventDefault();
				commitIfEditing();
				move(0, event.shiftKey ? -1 : 1);
			}
			// Escape is handled by the input, which has to stop it before it
			// reaches this handler and reads as "clear the selection".
			return;
		}

		switch (event.key) {
			case 'ArrowUp':
				event.preventDefault();
				move(-1, 0);
				return;
			case 'ArrowDown':
				event.preventDefault();
				move(1, 0);
				return;
			case 'ArrowLeft':
				event.preventDefault();
				move(0, -1);
				return;
			case 'ArrowRight':
				event.preventDefault();
				move(0, 1);
				return;
			case 'Tab':
				event.preventDefault();
				move(0, event.shiftKey ? -1 : 1);
				return;
			case 'Enter':
			case 'F2':
				event.preventDefault();
				beginEdit();
				return;
			case 'Home':
				event.preventDefault();
				position = event.ctrlKey ? { row: 0, col: 0 } : { ...position, col: 0 };
				return;
			case 'End':
				event.preventDefault();
				position = event.ctrlKey
					? { row: rows.length - 1, col: columns.length - 1 }
					: { ...position, col: columns.length - 1 };
				return;
			case 'Backspace':
			case 'Delete':
				event.preventDefault();
				beginEdit('');
				return;
		}

		/**
		 * Type-to-replace. A printable character with no modifier starts an edit
		 * seeded with that character, the way a spreadsheet does — the reader
		 * should not have to press Enter first to start typing over a value.
		 */
		if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
			event.preventDefault();
			beginEdit(event.key);
		}
	}
</script>

<Table.Root
	role="grid"
	aria-rowcount={rows.length}
	aria-colcount={columns.length}
	class="border-collapse"
	containerClass="h-full overflow-auto"
	scrollShadows={false}
	{onkeydown}
>
	<Table.Header class="sticky top-0 z-20">
		<Table.Row class="hover:bg-transparent">
			<Table.Head
				class="sticky left-0 z-30 w-12 border-r border-b border-border bg-surface-grid-header text-center font-mono text-caption font-semibold"
			>
				#
			</Table.Head>
			{#each columns as column, index (column.label)}
				<Table.Head
					class="min-w-40 border-r border-b border-border bg-surface-grid-header px-cell-x py-1"
					aria-sort="none"
				>
					<span class="block text-center font-mono text-caption text-muted-foreground">
						{columnName(index)}
					</span>
					<span class="block truncate text-caption font-medium">{column.label}</span>
				</Table.Head>
			{/each}
		</Table.Row>
	</Table.Header>

	<Table.Body>
		{#each rows as row, rowIndex (row.key)}
			<Table.Row class="border-0 hover:bg-transparent">
				<Table.Cell
					class="sticky left-0 z-10 h-row border-r border-b border-border bg-surface-grid-header p-0 text-center font-mono text-caption text-muted-foreground tabular-nums"
				>
					{row.label}
				</Table.Cell>
				{#each row.cells as cell, colIndex (cell.fieldKey)}
					<GridCell
						{cell}
						selected={position.row === rowIndex && position.col === colIndex}
						editing={editing && position.row === rowIndex && position.col === colIndex}
						bind:draft
						onSelect={() => {
							if (position.row !== rowIndex || position.col !== colIndex) {
								commitIfEditing();
								position = { row: rowIndex, col: colIndex };
							}
						}}
						onBeginEdit={() => beginEdit()}
						onCommit={(value) => {
							draft = value;
							commitIfEditing();
						}}
						onCancel={cancelEdit}
					/>
				{/each}
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>
