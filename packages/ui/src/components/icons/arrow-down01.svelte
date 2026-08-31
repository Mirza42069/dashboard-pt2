<script lang="ts">
	import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ArrowDown01Icon} {...props} />
