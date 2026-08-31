<script lang="ts">
	import { Delete02Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Delete02Icon} {...props} />
