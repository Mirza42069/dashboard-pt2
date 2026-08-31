<script lang="ts">
	import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ArrowUp01Icon} {...props} />
