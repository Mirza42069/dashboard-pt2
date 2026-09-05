<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import { getContext } from "svelte";
  const field = getContext<{ required: boolean } | undefined>("paviliun-field");
  let {
    value = $bindable(""),
    class: className = "",
    ...rest
  }: HTMLInputAttributes & { value?: string } = $props();
</script>

<input
  class={`input-base ${className}`}
  required={field?.required}
  bind:value
  {...rest}
/>
