<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import { Label } from '@DashboardPT2/ui/components/label';
	import { createForm } from '@tanstack/svelte-form';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import z from 'zod';

	import { getT } from '../../i18n/context.svelte';
	import BackLink from '$lib/components/back-link.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import FieldError from '$lib/components/field-error.svelte';
	import PageHeader from '$lib/components/page-header.svelte';
	import PageShell from '$lib/components/page-shell.svelte';
	import PasswordInput from '$lib/components/password-input.svelte';
	import { fieldError, focusFirstInvalid } from '$lib/field-error';
	import { toast } from '$lib/toast';

	const t = getT();
	const isSetup = $derived(page.url.searchParams.get('setup') === '1');

	let formEl = $state<HTMLFormElement | null>(null);

	/**
	 * The length rule lives here and in the auth package, which is the usual
	 * duplication for a password: the server is the authority and this is the
	 * only way to say so before the round trip.
	 *
	 * `mustDiffer` is checked client-side only. Better Auth will accept a
	 * password identical to the current one, and for an account flagged
	 * mustChangePassword that would clear the flag without changing anything.
	 */
	const schema = z
		.object({
			currentPassword: z.string().min(1, t.password.currentRequired),
			newPassword: z.string().min(12, t.password.minLength),
			confirmPassword: z.string().min(1, t.password.confirmRequired)
		})
		.refine((value) => value.newPassword === value.confirmPassword, {
			message: t.password.mismatch,
			path: ['confirmPassword']
		})
		.refine((value) => value.newPassword !== value.currentPassword, {
			message: t.password.mustDiffer,
			path: ['newPassword']
		});

	const form = createForm(() => ({
		defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			const response = await fetch('/api/change-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					currentPassword: value.currentPassword,
					newPassword: value.newPassword
				})
			});
			if (!response.ok) {
				toast.error(t.password.updateFailed);
				return;
			}
			toast.success(t.password.updated);
			void goto('/workbooks', { invalidateAll: true });
		}
	}));

	const fields = [
		{ name: 'currentPassword', label: t.password.current, autocomplete: 'current-password' },
		{ name: 'newPassword', label: t.password.new, autocomplete: 'new-password' },
		{ name: 'confirmPassword', label: t.password.confirm, autocomplete: 'new-password' }
	] as const;
</script>

<svelte:head><title>{isSetup ? t.password.setTitle : t.password.changeTitle} - {BRAND_NAME}</title></svelte:head>

<PageShell width="form">
	{#if !isSetup}<BackLink href="/workbooks" label={t.nav.workbooks} />{/if}
	<PageHeader
		title={isSetup ? t.password.setTitle : t.password.changeTitle}
		subtitle={t.password.setupDescription}
	/>

	<form
		bind:this={formEl}
		onsubmit={(event) => {
			event.preventDefault();
			event.stopPropagation();
			void form.handleSubmit().then(() => focusFirstInvalid(formEl));
		}}
		class="space-y-4"
		novalidate
	>
		<Card.Root class="max-w-md">
			<Card.Content class="space-y-4">
				{#each fields as spec (spec.name)}
					<form.Field name={spec.name}>
						{#snippet children(field)}
							{@const error = fieldError(field.name, field.state.meta.errors)}
							<div class="space-y-2">
								<Label for={field.name}>{spec.label}</Label>
								<PasswordInput
									{...error.control}
									name={field.name}
									autocomplete={spec.autocomplete}
									value={field.state.value}
									onblur={field.handleBlur}
									oninput={(event) => field.handleChange(event.currentTarget.value)}
								/>
								<FieldError {...error} />
							</div>
						{/snippet}
					</form.Field>
				{/each}
				<p class="text-xs text-muted-foreground">{t.password.revokeNote}</p>
			</Card.Content>
		</Card.Root>

		<form.Subscribe selector={(state) => state.isSubmitting}>
			{#snippet children(isSubmitting)}
				<div class="flex max-w-md flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					{#if !isSetup}<Button href="/workbooks" variant="outline">{t.common.cancel}</Button>{/if}
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? t.password.updating : t.password.update}
					</Button>
				</div>
			{/snippet}
		</form.Subscribe>
	</form>
</PageShell>
