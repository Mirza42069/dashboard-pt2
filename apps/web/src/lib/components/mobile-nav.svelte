<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import { Menu } from "@DashboardPT2/ui/components/icons";
	import * as Sheet from "@DashboardPT2/ui/components/sheet";

	import { getT } from "../../i18n/context.svelte";
	import AppNav from "./app-nav.svelte";
	import BrandMark from "./brand-mark.svelte";

	const t = getT();
	let open = $state(false);
</script>

<Sheet.Root bind:open>
	<Sheet.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="ghost" size="icon-sm" class="md:hidden" aria-label={t.nav.openNavigation}>
				<Menu />
			</Button>
		{/snippet}
	</Sheet.Trigger>
	<Sheet.Content side="left" class="w-64">
		<Sheet.Header>
			<Sheet.Title><BrandMark size="lg" /></Sheet.Title>
			<!-- Sheet requires a description; the nav does not need to show one. -->
			<Sheet.Description class="sr-only">{t.auth.tagline}</Sheet.Description>
		</Sheet.Header>
		<div class="flex min-h-0 flex-1 flex-col px-3 pb-4">
			<AppNav onNavigate={() => (open = false)} />
		</div>
	</Sheet.Content>
</Sheet.Root>
