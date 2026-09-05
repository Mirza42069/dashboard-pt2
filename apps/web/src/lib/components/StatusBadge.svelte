<script lang="ts">
  import { statusLabel } from "$lib/format";
  let { status }: { status: string } = $props();
  const tone = $derived(
    ["paid", "succeeded", "active", "available", "resolved"].includes(status)
      ? "bg-forest-soft text-forest"
      : ["overdue", "urgent", "failed", "void"].includes(status)
        ? "bg-clay-soft text-danger"
        : "bg-canvas text-muted",
  );
</script>

<span
  class={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full px-2.5 text-xs font-semibold ${tone}`}
>
  {statusLabel(status)}
</span>
