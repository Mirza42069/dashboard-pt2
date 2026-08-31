<script lang="ts">
	import * as Card from '@DashboardPT2/ui/components/card';

	import { getT } from '../../../i18n/context.svelte';
	import BrandMark from '$lib/components/brand-mark.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
	import SignInForm from '$lib/components/sign-in-form.svelte';

	const t = getT();
</script>

<svelte:head>
	<title>{t.auth.signIn} - {BRAND_NAME}</title>
</svelte:head>

<div class="grid min-h-svh place-items-center px-4 py-10">
	<div class="w-full max-w-sm space-y-6">
		<!-- The mark carries the brand without a separate Latin wordmark. -->
		<div class="space-y-1 text-center">
			<BrandMark size="lg" class="mx-auto mb-3" />
			<p class="text-base font-semibold tracking-tight">{BRAND_NAME}</p>
			<p class="text-xs text-muted-foreground">{t.auth.tagline}</p>
		</div>

		<Card.Root>
			<Card.Content>
				<SignInForm />
			</Card.Content>
		</Card.Root>

		<p class="text-center text-xs text-muted-foreground">{t.auth.contactAdminFootnote}</p>
	</div>
</div>
