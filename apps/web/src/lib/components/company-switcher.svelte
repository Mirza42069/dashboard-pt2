<script lang="ts" module>
	const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

	function companyLabel(company: { id: string; name: string }, fallback: string) {
		const name = company.name.trim();
		return name && name !== company.id && !UUID.test(name) ? name : fallback;
	}
</script>

<script lang="ts">
	import { Building2 } from "@DashboardPT2/ui/components/icons";
	import * as Select from "@DashboardPT2/ui/components/select";
	import { createQuery, useQueryClient } from "@tanstack/svelte-query";
	import { invalidateAll } from "$app/navigation";

	import { getT } from "../../i18n/context.svelte";
	import { writeCompanyCookie } from "../company";
	import { orpc } from "../orpc";

	/**
	 * Which company the dashboard is currently showing.
	 *
	 * System accounts get a picker. The header does not mount this control for
	 * company-pinned User or Admin accounts.
	 */
	const t = getT();
	const queryClient = useQueryClient();

	let pending = $state(false);

	const options = createQuery(() => orpc.company.options.queryOptions());
	const companies = $derived(options.data?.companies ?? []);
	const activeId = $derived(options.data?.activeId ?? "");
	const canSwitch = $derived(options.data?.canSwitch ?? false);
	const activeCompany = $derived(companies.find((company) => company.id === activeId));
	const activeLabel = $derived(
		activeCompany ? companyLabel(activeCompany, t.company.placeholder) : t.company.placeholder
	);

	async function select(companyId: string) {
		if (!companyId || companyId === activeId) return;
		pending = true;
		writeCompanyCookie(companyId);
		// The cookie changes what every query resolves to, so nothing cached under
		// the old company may survive — and server load functions need re-running.
		queryClient.clear();
		await invalidateAll();
		pending = false;
	}
</script>

{#if options.isPending}
	<!--
		w-44 to match the resolved Select trigger below. A narrower placeholder
		shifts the whole header the moment the query lands.
	-->
	<div class="h-8 w-44 animate-pulse rounded-md bg-muted" aria-hidden="true"></div>
{:else if !canSwitch}
	{#if companies[0]}
		<!--
			Same w-44 box as the admin trigger and the placeholder, so the header
			lays out identically for both roles and across the loading swap.
		-->
		<div class="flex h-8 w-44 items-center gap-1.5 text-xs text-muted-foreground">
			<Building2 class="size-3.5 shrink-0" />
			<span class="truncate font-medium text-foreground">
				{companyLabel(companies[0], t.company.placeholder)}
			</span>
		</div>
	{/if}
{:else}
	<Select.Root
		type="single"
		value={activeCompany ? activeId : ""}
		onValueChange={(value) => void select(value ?? "")}
		disabled={pending}
	>
		<Select.Trigger size="sm" class="w-44" aria-label={t.company.switcherLabel}>
			<Building2 class="size-3.5 shrink-0 text-muted-foreground" />
			<span data-slot="select-value" class="flex flex-1 text-left">{activeLabel}</span>
		</Select.Trigger>
		<Select.Content>
			{#each companies as item (item.id)}
				<Select.Item value={item.id} label={companyLabel(item, t.company.placeholder)}>
					{companyLabel(item, t.company.placeholder)}
				</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
{/if}
