<script lang="ts">
	import { Download01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Download01Icon} {...props} />
