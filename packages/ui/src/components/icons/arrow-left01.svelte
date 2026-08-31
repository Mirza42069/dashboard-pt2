<script lang="ts">
	import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={ArrowLeft01Icon} {...props} />
