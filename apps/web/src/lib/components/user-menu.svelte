<script lang="ts" module>
	function initials(name: string) {
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part.charAt(0).toUpperCase())
			.join('');
	}
</script>

<script lang="ts">
	import { Button, buttonVariants } from '@DashboardPT2/ui/components/button';
	import {
		Accessibility,
		KeyRound,
		Languages,
		LogOut
	} from '@DashboardPT2/ui/components/icons';
	import * as Popover from '@DashboardPT2/ui/components/popover';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { goto } from '$app/navigation';

	import type { Locale } from '../../i18n';
	import { getLocaleState, getT, setLocaleCookie } from '../../i18n/context.svelte';
	import { authClient } from '../auth-client';
	import { setTextScaleCookie, type TextScale } from '../text-scale';
	import type { ShellUser } from './app-shell.svelte';
	import PreferenceGroup from './preference-group.svelte';

	let { user, initialTextScale }: { user: ShellUser; initialTextScale: TextScale } = $props();

	const t = getT();
	const i18n = getLocaleState();
	const queryClient = useQueryClient();

	let open = $state(false);
	// svelte-ignore state_referenced_locally
	// Initial value only — see the same note in app-shell.svelte.
	let textScale = $state(initialTextScale);

	async function signOut() {
		open = false;
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					queryClient.clear();
					void goto('/', { invalidateAll: true });
				}
			}
		});
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="sm" aria-label={t.users.myAccount}>
				<span
					class="flex size-5 items-center justify-center rounded-full bg-muted text-caption font-medium"
				>
					{initials(user.name)}
				</span>
				<span class="hidden sm:inline">{user.name}</span>
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content
		side="bottom"
		align="end"
		sideOffset={8}
		aria-label={t.users.myAccount}
		class="w-[min(24rem,calc(100vw-1.5rem))] max-w-none p-0"
	>
		<div class="flex items-start gap-3 border-b px-4 py-4">
			<div
				aria-hidden="true"
				class="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold"
			>
				{initials(user.name)}
			</div>
			<div class="min-w-0 flex-1">
				<p class="truncate font-semibold text-foreground">{user.name}</p>
				<p class="truncate text-xs text-muted-foreground">{user.email}</p>
			</div>
		</div>

		<div class="max-h-[min(30rem,calc(100svh-5rem))] space-y-5 overflow-y-auto p-4">
			<div class="space-y-2">
				<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
					<Accessibility class="size-3.5" />
					{t.settings.textSize}
				</p>
				<PreferenceGroup
					label={t.settings.textSize}
					value={textScale}
					options={[
						{ value: 'normal' as TextScale, label: t.settings.textSizeNormal },
						{ value: 'large' as TextScale, label: t.settings.textSizeLarge }
					]}
					onSelect={(value) => {
						textScale = value;
						setTextScaleCookie(value);
						// Applied to <html> here as well as written to the cookie, so the
						// change is visible now rather than only after the next request.
						document.documentElement.classList.toggle('a11y-large-text', value === 'large');
					}}
				/>
			</div>

			<div class="space-y-2 border-t pt-4">
				<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
					<Languages class="size-3.5" />
					{t.settings.language}
				</p>
				<PreferenceGroup
					label={t.settings.language}
					value={i18n.locale}
					options={[
						{ value: 'en' as Locale, label: t.settings.english },
						{ value: 'id' as Locale, label: t.settings.indonesian }
					]}
					onSelect={setLocaleCookie}
				/>
			</div>
		</div>

		<div class="grid gap-2 border-t p-3 sm:grid-cols-2">
			<a
				href="/change-password"
				class={buttonVariants({ variant: 'outline', size: 'sm' })}
				onclick={() => (open = false)}
			>
				<KeyRound />
				{t.password.changeTitle}
			</a>
			<Button variant="destructive" size="sm" onclick={signOut}>
				<LogOut />
				{t.auth.signOut}
			</Button>
		</div>
	</Popover.Content>
</Popover.Root>
