<script lang="ts">
  import Button from "./Button.svelte";
  let { message = "Data belum dapat dimuat." }: { message?: string } = $props();
</script>

<div class="rounded-lg border border-clay/25 bg-clay-soft p-5" role="alert">
  <p class="font-semibold text-danger">{message}</p>
  <p class="mt-1 text-sm leading-6 text-muted">
    Periksa koneksi Anda, lalu coba muat ulang. Jika masalah berlanjut, hubungi
    pemilik ruang kerja.
  </p>
  <div class="mt-4">
    <Button variant="secondary" onclick={() => location.reload()}>
      Muat ulang halaman
    </Button>
  </div>
</div>
