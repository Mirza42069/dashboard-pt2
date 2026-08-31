<script lang="ts">
	import { DashedLineCircleIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={DashedLineCircleIcon} {...props} />
