<script lang="ts">
  import QRCode from "qrcode";
  let {
    value,
    alt,
    size = 360,
  }: { value: string; alt: string; size?: number } = $props();
  let dataUrl = $state("");
  let error = $state("");
  $effect(() => {
    const current = value;
    let cancelled = false;
    dataUrl = "";
    error = "";
    QRCode.toDataURL(current, {
      width: size,
      margin: 2,
      color: { dark: "#173e2b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) dataUrl = url;
      })
      .catch(() => {
        if (!cancelled) error = "Kode QR belum dapat ditampilkan. Muat ulang halaman untuk mencoba lagi.";
      });
    return () => { cancelled = true; };
  });
</script>

{#if error}<p class="text-sm text-danger" role="alert">
    {error}
  </p>{:else if dataUrl}<img
    src={dataUrl}
    {alt}
    class="mx-auto size-64 max-w-full rounded-lg bg-white p-2 outline outline-1 outline-black/10"
  />{:else}<div
    class="skeleton mx-auto size-64"
    aria-label="Menyiapkan kode QR"
  ></div>{/if}
