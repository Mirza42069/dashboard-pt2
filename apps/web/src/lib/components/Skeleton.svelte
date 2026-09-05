<script lang="ts">
  let { rows = 4 }: { rows?: number } = $props();
</script>

<div
  class="surface space-y-5 rounded-lg p-7"
  aria-label="Memuat data"
  aria-busy="true"
>
  <p class="text-sm text-muted" role="status">Menyiapkan catatan Anda...</p>
  <div class="skeleton h-5 w-36"></div>
  {#each Array(rows) as _, i (i)}<div class="skeleton h-11 w-full"></div>{/each}
</div>
