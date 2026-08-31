<script lang="ts">
	import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ArrowUpRight01Icon} {...props} />
