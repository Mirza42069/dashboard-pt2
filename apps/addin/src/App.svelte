<script lang="ts">
	import { onMount } from "svelte";

	import { t } from "./lib/i18n";
	import { initOffice } from "./lib/office";
	import Panel from "./components/Panel.svelte";

	let ready = $state(false);

	onMount(async () => {
		await initOffice();
		ready = true;
	});
</script>

{#if ready}
	<Panel />
{:else}
	<div class="flex h-full items-center justify-center">
		<p class="text-xs text-muted-foreground">{t("loading")}</p>
	</div>
{/if}
