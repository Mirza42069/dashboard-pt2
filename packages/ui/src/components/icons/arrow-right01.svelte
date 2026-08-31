<script lang="ts">
	import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ArrowRight01Icon} {...props} />
