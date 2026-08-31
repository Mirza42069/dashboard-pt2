<script lang="ts">
	import { Sun03Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Sun03Icon} {...props} />
