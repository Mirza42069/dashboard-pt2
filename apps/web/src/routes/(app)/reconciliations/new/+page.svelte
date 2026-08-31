<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import { ArrowLeft, Plus } from '@DashboardPT2/ui/components/icons';
	import { Input } from '@DashboardPT2/ui/components/input';
	import { Label } from '@DashboardPT2/ui/components/label';
	import * as Select from '@DashboardPT2/ui/components/select';
	import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';

	import { getT } from '../../../../i18n/context.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import { client } from '$lib/orpc';
	import { toast } from '$lib/toast';
	import { financeKeys, reconciliationId, type CreateReconciliationInput } from '../finance-api';

	const t = getT();
	const queryClient = useQueryClient();
	let errorMessage = $state('');
	let form = $state<CreateReconciliationInput>({
		name: '',
		legalEntityId: '',
		ledgerAccountId: '',
		periodStart: '',
		periodEnd: '',
		currency: 'USD'
	});
	const options = createQuery(() => ({
		queryKey: financeKeys.options,
		queryFn: () => client.reconciliation.options()
	}));
	const selectedLegalEntity = $derived(
		options.data?.legalEntities.find((entity) => entity.id === form.legalEntityId)
	);
	const availableAccounts = $derived(
		options.data?.ledgerAccounts.filter((account) => account.legalEntityId === form.legalEntityId) ?? []
	);
	const selectedAccount = $derived(
		availableAccounts.find((account) => account.id === form.ledgerAccountId)
	);

	function selectLegalEntity(value: string) {
		form.legalEntityId = value;
		form.ledgerAccountId = '';
		const entity = options.data?.legalEntities.find((item) => item.id === value);
		if (entity) form.currency = entity.baseCurrency;
	}

	function selectLedgerAccount(value: string) {
		form.ledgerAccountId = value;
		const account = availableAccounts.find((item) => item.id === value);
		if (account) form.currency = account.currency;
	}

	const createReconciliation = createMutation(() => ({
		mutationFn: (input: CreateReconciliationInput) => client.reconciliation.create(input),
		onSuccess: (created) => {
			const id = reconciliationId(created);
			toast.success(t.reconciliations.created);
			void queryClient.invalidateQueries({ queryKey: financeKeys.reconciliations });
			void queryClient.invalidateQueries({ queryKey: financeKeys.summary });
			void goto(id ? `/reconciliations/${id}` : '/reconciliations');
		},
		onError: () => {
			errorMessage = t.reconciliations.createFailed;
			toast.error(t.reconciliations.createFailed);
		}
	}));

	function submit() {
		errorMessage = '';
		if (
			!form.name.trim() ||
			!form.legalEntityId.trim() ||
			!form.ledgerAccountId.trim() ||
			!form.periodStart ||
			!form.periodEnd ||
			!form.currency.trim()
		) {
			errorMessage = t.reconciliations.required;
			return;
		}
		if (form.periodEnd < form.periodStart) {
			errorMessage = t.reconciliations.invalidPeriod;
			return;
		}
		createReconciliation.mutate({
			...form,
			name: form.name.trim(),
			legalEntityId: form.legalEntityId.trim(),
			ledgerAccountId: form.ledgerAccountId.trim(),
			currency: form.currency.trim().toUpperCase()
		});
	}
</script>

<svelte:head><title>{t.reconciliations.createTitle} - {BRAND_NAME}</title></svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
	<a href="/reconciliations" class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
		<ArrowLeft class="size-3.5" />{t.reconciliations.backToList}
	</a>
	<header class="border-b pb-5">
		<h1 class="text-xl font-semibold tracking-tight md:text-2xl">{t.reconciliations.createTitle}</h1>
		<p class="mt-1 text-sm text-muted-foreground">{t.reconciliations.createSubtitle}</p>
	</header>

	<form
		onsubmit={(event) => {
			event.preventDefault();
			submit();
		}}
		class="space-y-4"
	>
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">{t.reconciliations.identity}</Card.Title>
			</Card.Header>
			<Card.Content class="grid gap-5 sm:grid-cols-2">
				<div class="space-y-2 sm:col-span-2">
					<Label for="name">{t.reconciliations.name}</Label>
					<Input id="name" bind:value={form.name} placeholder={t.reconciliations.namePlaceholder} required />
				</div>
				<div class="space-y-2">
					<Label for="legalEntityId">{t.reconciliations.legalEntityId}</Label>
					<Select.Root
						type="single"
						value={form.legalEntityId}
						onValueChange={(value) => selectLegalEntity(value ?? '')}
						disabled={options.isPending || !options.data?.legalEntities.length}
					>
						<Select.Trigger id="legalEntityId" class="w-full">
							{selectedLegalEntity ? `${selectedLegalEntity.code} · ${selectedLegalEntity.name}` : t.reconciliations.selectLegalEntity}
						</Select.Trigger>
						<Select.Content>
							{#each options.data?.legalEntities ?? [] as entity (entity.id)}
								<Select.Item value={entity.id} label={`${entity.code} · ${entity.name}`}>
									{entity.code} · {entity.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label for="ledgerAccountId">{t.reconciliations.ledgerAccountId}</Label>
					<Select.Root
						type="single"
						value={form.ledgerAccountId}
						onValueChange={(value) => selectLedgerAccount(value ?? '')}
						disabled={!form.legalEntityId || availableAccounts.length === 0}
					>
						<Select.Trigger id="ledgerAccountId" class="w-full">
							{selectedAccount ? `${selectedAccount.code} · ${selectedAccount.name}` : t.reconciliations.selectLedgerAccount}
						</Select.Trigger>
						<Select.Content>
							{#each availableAccounts as account (account.id)}
								<Select.Item value={account.id} label={`${account.code} · ${account.name}`}>
									{account.code} · {account.name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-muted-foreground">{t.reconciliations.accountSelectionHint}</p>
				</div>
				<div class="space-y-2">
					<Label for="periodStart">{t.reconciliations.periodStart}</Label>
					<Input id="periodStart" type="date" bind:value={form.periodStart} required />
				</div>
				<div class="space-y-2">
					<Label for="periodEnd">{t.reconciliations.periodEnd}</Label>
					<Input id="periodEnd" type="date" bind:value={form.periodEnd} required />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title class="text-sm">{t.reconciliations.currency}</Card.Title>
			</Card.Header>
			<Card.Content class="max-w-40">
				<div class="space-y-2">
					<Label for="currency">{t.reconciliations.currency}</Label>
					<Input id="currency" bind:value={form.currency} maxlength={3} class="font-mono uppercase" required />
				</div>
			</Card.Content>
		</Card.Root>

		{#if errorMessage}
			<p role="alert" class="rounded-lg border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">{errorMessage}</p>
		{/if}

		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<Button href="/reconciliations" variant="outline">{t.common.cancel}</Button>
			<Button type="submit" disabled={createReconciliation.isPending}>
				<Plus />
				{createReconciliation.isPending ? t.reconciliations.creating : t.reconciliations.create}
			</Button>
		</div>
	</form>
</div>
