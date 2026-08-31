<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import BrandMark from '$lib/components/brand-mark.svelte';
	import { BRAND_NAME } from '$lib/components/brand';
</script>

<svelte:head><title>{BRAND_NAME}</title></svelte:head>

<div class="grid min-h-svh place-items-center px-6">
	<div class="space-y-4 text-center">
		<BrandMark size="lg" class="mx-auto" />
		<div>
			<h1 class="text-xl font-semibold tracking-tight">{BRAND_NAME}</h1>
			<p class="mt-1 text-sm text-muted-foreground">Enterprise bank reconciliation</p>
		</div>
		<Button href="/login">Sign in</Button>
	</div>
</div>
