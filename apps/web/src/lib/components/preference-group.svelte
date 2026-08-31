<script lang="ts" generics="T extends string">
	import { Button } from '@DashboardPT2/ui/components/button';

	/**
	 * A two-up segmented control for the account menu's preferences.
	 *
	 * Buttons with aria-pressed rather than a radio group: these apply
	 * immediately and have no form to submit, so "pressed" describes them more
	 * honestly than "selected".
	 */
	let {
		label,
		value,
		options,
		onSelect
	}: {
		label: string;
		value: T;
		options: { value: T; label: string }[];
		onSelect: (value: T) => void;
	} = $props();
</script>

<div class="grid grid-cols-2 gap-2" role="group" aria-label={label}>
	{#each options as option (option.value)}
		<Button
			variant={value === option.value ? 'secondary' : 'outline'}
			size="sm"
			aria-pressed={value === option.value}
			onclick={() => {
				if (option.value !== value) onSelect(option.value);
			}}
		>
			{option.label}
		</Button>
	{/each}
</div>
