<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { Bell } from '@DashboardPT2/ui/components/icons';
	import * as Popover from '@DashboardPT2/ui/components/popover';
	import { Skeleton } from '@DashboardPT2/ui/components/skeleton';
	import { createQuery } from '@tanstack/svelte-query';

	import type { Dictionary } from '../../i18n';
	import { interpolate } from '../../i18n';
	import { getT } from '../../i18n/context.svelte';
	import { orpc } from '../orpc';
	import { useFormat } from '../use-format.svelte';

	type Sentences = Dictionary['activity']['sentence'];

	const t = getT();
	const { formatDateTime } = useFormat();

	let open = $state(false);

	const query = createQuery(() => ({
		...orpc.activity.list.queryOptions({ input: { limit: 10, offset: 0 } }),
		enabled: open
	}));

	function describe(entry: {
		entityType: string;
		action: string;
		actorName: string;
		entityLabel: string;
		detail: string | null;
	}) {
		const key = `${entry.entityType}_${entry.action}` as keyof Sentences;
		const template = t.activity.sentence[key] ?? t.activity.sentence.fallback;
		let detail = entry.detail ?? '';

		if (entry.entityType === 'user' && entry.action === 'role_changed') {
			detail = detail === 'admin' ? t.users.roleAdmin : t.users.roleUser;
		}

		return interpolate(template, {
			actor: entry.actorName,
			label: entry.entityLabel,
			detail
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon-sm" aria-label={t.activity.title}>
				<Bell />
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content
		side="bottom"
		align="center"
		sideOffset={8}
		aria-label={t.activity.title}
		class="w-[min(24rem,calc(100vw-1.5rem))] max-w-none p-0"
	>
		<div class="border-b px-4 py-3">
			<p class="font-semibold text-foreground">{t.activity.title}</p>
		</div>
		<div class="max-h-[min(28rem,calc(100svh-5rem))] overflow-y-auto p-2">
			{#if query.isPending}
				<div class="space-y-3 p-2" aria-label={t.activity.loading}>
					{#each Array.from({ length: 5 }, (_, index) => index) as index (index)}
						<Skeleton class="h-10 w-full" />
					{/each}
				</div>
			{:else if query.isError}
				<p class="px-3 py-8 text-center text-destructive">{query.error.message}</p>
			{:else if (query.data?.entries.length ?? 0) === 0}
				<p class="px-3 py-8 text-center text-muted-foreground">{t.activity.empty}</p>
			{:else}
				{#each query.data?.entries ?? [] as entry (entry.id)}
					<div class="px-3 py-2.5">
						<p class="text-foreground">{describe(entry)}</p>
						<p class="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
					</div>
				{/each}
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
