<script lang="ts">
  import type { Component } from "svelte";
  let {
    label,
    value,
    note = "",
    icon,
  }: {
    label: string;
    value: string;
    note?: string;
    icon: Component;
  } = $props();
  const Icon = $derived(icon);
</script>

<article class="border-t-2 border-forest/35 px-1 py-6">
  <div class="mb-5 flex items-start justify-between gap-3">
    <p class="text-sm font-medium text-muted">{label}</p>
    <Icon size={20} aria-hidden="true" class="text-forest" />
  </div>
  <p
    class="tabular break-words text-[clamp(1.35rem,2.1vw,2rem)] font-medium tracking-[-0.04em]"
  >
    {value}
  </p>
  {#if note}<p class="mt-1.5 text-xs leading-5 text-muted">{note}</p>{/if}
</article>
