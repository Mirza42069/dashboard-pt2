<script lang="ts">
	import { FileQuestionMarkIcon } from "@hugeicons/core-free-icons";
	import Icon, { type IconProps } from "./icon.svelte";

	let props: IconProps = $props();
</script>

<Icon icon={FileQuestionMarkIcon} {...props} />
