<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import { goto } from '$app/navigation';

	import { getT } from '../../i18n/context.svelte';
	import { authClient } from '$lib/auth-client';
	import BrandMark from '$lib/components/brand-mark.svelte';
	import { BRAND_NAME, CONTACT_EMAIL } from '$lib/components/brand';

	let { data } = $props();
	const t = getT();

	async function signOut() {
		await authClient.signOut({
			fetchOptions: { onSuccess: () => void goto('/login', { invalidateAll: true }) }
		});
	}
</script>

<svelte:head><title>{t.auth.trialEndedTitle} - {BRAND_NAME}</title></svelte:head>

<main class="grid min-h-svh place-items-center px-4 py-10">
	<div class="w-full max-w-md space-y-6 text-center">
		<BrandMark size="lg" class="mx-auto" />
		<Card.Root>
			<Card.Content class="space-y-4 pt-6">
				<div class="space-y-2">
					<h1 class="text-lg font-semibold">{t.auth.trialEndedTitle}</h1>
					<p class="text-sm text-muted-foreground">{t.auth.trialEnded}</p>
					<p class="text-xs text-muted-foreground">{data.email}</p>
				</div>
				<div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
					<Button href={`mailto:${CONTACT_EMAIL}`}>{t.auth.contactSupport}</Button>
					<Button variant="outline" onclick={signOut}>{t.auth.signOut}</Button>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</main>
