<script lang="ts">
	import { Loading03Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Loading03Icon} {...props} />
