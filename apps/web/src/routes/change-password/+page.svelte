<script lang="ts">
	import * as Card from '@DashboardPT2/ui/components/card';

	import { getT } from '../../i18n/context.svelte';

	const t = getT();
</script>

<div class="mx-auto grid min-h-svh max-w-md place-items-center p-4">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>{t.password.changeTitle}</Card.Title>
			<Card.Description>Not ported yet.</Card.Description>
		</Card.Header>
	</Card.Root>
</div>
