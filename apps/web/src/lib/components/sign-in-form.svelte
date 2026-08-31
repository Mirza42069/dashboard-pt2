<script lang="ts">
	import { TRIAL_ENDED_CODE } from '@DashboardPT2/api/lib/trial';
	import { isValidAccountName } from '@DashboardPT2/auth/username';
	import { Button } from '@DashboardPT2/ui/components/button';
	import { Input } from '@DashboardPT2/ui/components/input';
	import { Label } from '@DashboardPT2/ui/components/label';
	import { createForm } from '@tanstack/svelte-form';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import z from 'zod';

	import { getT } from '../../i18n/context.svelte';
	import { authClient } from '../auth-client';
	import { fieldError, focusFirstInvalid } from '../field-error';
	import { toast } from '../toast';
	import FieldError from './field-error.svelte';
	import PasswordInput from './password-input.svelte';

	const t = getT();
	const queryClient = useQueryClient();

	let formEl = $state<HTMLFormElement | null>(null);

	const schema = z.object({
		identifier: z
			.string()
			.trim()
			.min(1, t.auth.emailRequired)
			.refine(
				(value) => (value.includes('@') ? z.email().safeParse(value).success : isValidAccountName(value)),
				t.auth.invalidIdentifier
			),
		password: z.string().min(1, t.auth.passwordRequired)
	});

	const form = createForm(() => ({
		defaultValues: { identifier: '', password: '' },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			const identifier = value.identifier.trim();
			// hooks.server.ts stores the page you were trying to reach here.
			const next = page.url.searchParams.get('next');

			const callbacks = {
				onSuccess: () => {
					queryClient.clear();
					// Only same-origin paths — an attacker-supplied absolute URL in
					// ?next= would otherwise turn this into an open redirect.
					const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/workbooks';
					void goto(target, { invalidateAll: true });
				},
				onError: (error: {
					error: { code?: string; message?: string; statusText?: string };
				}) => {
					// A paused (banned) account gets the subscription message, not
					// better-auth's raw "You have been banned" text.
					if (error.error.code === 'BANNED_USER') {
						toast.error(t.auth.accountPaused, { duration: 8000 });
						return;
					}
					// A lapsed trial is refused the same way but is not the same thing:
					// "renew your subscription" is the wrong instruction for someone who
					// never had one.
					if (error.error.code === TRIAL_ENDED_CODE) {
						toast.error(t.auth.trialEnded, { duration: 8000 });
						return;
					}
					toast.error(error.error.message || error.error.statusText || t.auth.signInFailed);
				}
			};

			if (identifier.includes('@')) {
				await authClient.signIn.email({ email: identifier, password: value.password }, callbacks);
			} else {
				await authClient.signIn.username({ username: identifier, password: value.password }, callbacks);
			}
		}
	}));
</script>

<form
	bind:this={formEl}
	onsubmit={(e) => {
		e.preventDefault();
		e.stopPropagation();
		// Validation is async, so the aria-invalid attributes this reads do not
		// exist until the component has re-rendered with the results.
		void form.handleSubmit().then(() => focusFirstInvalid(formEl));
	}}
	class="space-y-4"
	novalidate
>
	<div class="space-y-1">
		<h1 class="text-sm font-medium">{t.auth.signIn}</h1>
		<p class="text-xs text-muted-foreground">{t.auth.useIssuedCredentials}</p>
	</div>

	<form.Field name="identifier">
		{#snippet children(field)}
			{@const error = fieldError(field.name, field.state.meta.errors)}
			<div class="space-y-2">
				<Label for={field.name}>{t.auth.emailOrUsername}</Label>
				<Input
					{...error.control}
					name={field.name}
					type="text"
					autocomplete="username"
					autocapitalize="none"
					spellcheck={false}
					value={field.state.value}
					onblur={field.handleBlur}
					oninput={(e) => field.handleChange(e.currentTarget.value)}
				/>
				<FieldError {...error} />
			</div>
		{/snippet}
	</form.Field>

	<form.Field name="password">
		{#snippet children(field)}
			{@const error = fieldError(field.name, field.state.meta.errors)}
			<div class="space-y-2">
				<Label for={field.name}>{t.auth.password}</Label>
				<PasswordInput
					{...error.control}
					name={field.name}
					autocomplete="current-password"
					value={field.state.value}
					onblur={field.handleBlur}
					oninput={(e) => field.handleChange(e.currentTarget.value)}
				/>
				<FieldError {...error} />
			</div>
		{/snippet}
	</form.Field>

	<!--
		Disabled only while the request is in flight, not on `!canSubmit`.
		Validation here runs onSubmit only, so after one failed attempt canSubmit
		stays false until the form revalidates — and the only thing that
		revalidates it is a submit, which the disabled button prevents. Correcting
		the email would leave the user pressing a dead control with no explanation.
		Keeping submit live also matches how the errors announce: press, hear what
		is wrong, fix it, press again.
	-->
	<form.Subscribe selector={(state) => state.isSubmitting}>
		{#snippet children(isSubmitting)}
			<Button type="submit" size="lg" class="w-full" disabled={isSubmitting}>
				{isSubmitting ? t.auth.signingIn : t.auth.signIn}
			</Button>
		{/snippet}
	</form.Subscribe>
</form>
