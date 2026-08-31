<script lang="ts">
	import { DashboardSquare01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={DashboardSquare01Icon} {...props} />
