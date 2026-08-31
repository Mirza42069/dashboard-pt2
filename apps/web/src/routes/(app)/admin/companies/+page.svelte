<script lang="ts">
	import * as Card from '@DashboardPT2/ui/components/card';

	import { getT } from '../../../../i18n/context.svelte';

	const t = getT();
</script>

<div class="mx-auto w-full max-w-[1600px] p-4 md:p-6">
	<h1 class="text-base font-semibold tracking-tight">{t.nav.companies}</h1>
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Description>Not ported yet.</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
