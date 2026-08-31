<script lang="ts">
	import { ShieldMinusIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ShieldMinusIcon} {...props} />
