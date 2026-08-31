<script lang="ts">
	import { Tick02Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Tick02Icon} {...props} />
