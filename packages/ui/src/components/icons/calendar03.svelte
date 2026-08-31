<script lang="ts">
	import { Calendar03Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Calendar03Icon} {...props} />
