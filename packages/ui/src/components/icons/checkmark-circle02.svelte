<script lang="ts">
	import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={CheckmarkCircle02Icon} {...props} />
