<script lang="ts">
	import { Notification03Icon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={Notification03Icon} {...props} />
