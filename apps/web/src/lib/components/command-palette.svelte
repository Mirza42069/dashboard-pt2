<script lang="ts">
	import * as Command from '@DashboardPT2/ui/components/command';
	import {
		FileCode2,
		FileSpreadsheet,
		Plus,
		Sparkles,
		Upload
	} from '@DashboardPT2/ui/components/icons';
	import { createQuery } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';

	import { getT } from '../../i18n/context.svelte';
	import {
		commandPaletteOpen,
		setCommandPaletteOpen,
		toggleCommandPalette
	} from '../command-palette.svelte';
	import { client } from '../orpc';

	const t = getT();
	const open = $derived(commandPaletteOpen());

	/**
	 * Only fetched once the palette has been opened. The workbook list is not
	 * cheap and most sessions never reach for ⌘K; `enabled` keeps it off the
	 * critical path of every page in the app.
	 */
	const workbooks = createQuery(() => ({
		queryKey: ['reconciliation', 'list', 'palette'],
		queryFn: () => client.reconciliation.list({ limit: 25 }),
		enabled: open
	}));

	function run(action: () => void) {
		setCommandPaletteOpen(false);
		action();
	}

	const items = $derived(workbooks.data?.items ?? []);
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
		event.preventDefault();
		toggleCommandPalette();
	}}
/>

<Command.Dialog
	{open}
	onOpenChange={setCommandPaletteOpen}
	title={t.palette.title}
	description={t.palette.description}
>
	<Command.Input placeholder={t.palette.placeholder} />
	<Command.List>
		<Command.Empty>{t.palette.empty}</Command.Empty>

		<Command.Group heading={t.palette.go}>
			<Command.Item onSelect={() => run(() => goto('/workbooks'))}>
				<FileSpreadsheet class="size-3.5" />
				{t.nav.workbooks}
			</Command.Item>
			<Command.Item onSelect={() => run(() => goto('/imports'))}>
				<Upload class="size-3.5" />
				{t.nav.imports}
			</Command.Item>
			<Command.Item onSelect={() => run(() => goto('/tax-reports'))}>
				<FileCode2 class="size-3.5" />
				{t.nav.taxReports}
			</Command.Item>
		</Command.Group>

		<Command.Separator />

		<Command.Group heading={t.palette.actions}>
			<Command.Item onSelect={() => run(() => goto('/workbooks?new=1'))}>
				<Plus class="size-3.5" />
				{t.workbooks.create}
			</Command.Item>
		</Command.Group>

		{#if items.length > 0}
			<Command.Separator />
			<Command.Group heading={t.nav.workbooks}>
				{#each items as item (item.id)}
					<Command.Item
						value={`${item.name} ${item.id}`}
						onSelect={() => run(() => goto(`/workbooks/${item.id}`))}
					>
						<FileSpreadsheet class="size-3.5 text-muted-foreground" />
						<span class="truncate">{item.name}</span>
					</Command.Item>
				{/each}
			</Command.Group>
		{/if}
	</Command.List>
</Command.Dialog>
