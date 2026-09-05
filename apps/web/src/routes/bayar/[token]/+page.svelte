<script lang="ts">
  import { page } from "$app/state";
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import { useAction, useQuery } from "convex-svelte";
  import Button from "$lib/components/Button.svelte";
  import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatPeriod,
  } from "$lib/format";
  import QrImage from "$lib/components/QrImage.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import {
    BuildingsIcon,
    CheckCircleIcon,
    ClockIcon,
    QrCodeIcon,
    ShieldCheckIcon,
    WarningIcon,
  } from "phosphor-svelte";
  const validToken = $derived(/^pay_[a-f0-9]{32}$/.test(page.params.token ?? ""));
  const payment = useQuery(api.publicPayments.getByToken, () => validToken && page.params.token ? { token: page.params.token } : "skip");
  const createQris = useAction(api.publicPayments.createQris);
  let requesting = $state(false);
  let notice = $state("");
  let retryAt = $state(0);
  let now = $state(Date.now());
  const retrySeconds = $derived(Math.max(0, Math.ceil((retryAt - now) / 1000)));
  $effect(() => {
    const token = page.params.token;
    requesting = false;
    notice = "";
    retryAt = 0;
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  const qrisExpired = $derived(
    payment.data?.qris ? payment.data.qris.expiresAt <= now : false,
  );
  async function requestQris() {
    const token = page.params.token;
    if (!validToken || !token || requesting || retrySeconds || !payment.data || payment.data.invoice.status === "paid") return;
    requesting = true;
    notice = "";
    try {
      const result = await createQris({ token });
      if (page.params.token !== token) return;
      now = Date.now();
      retryAt = now + 30000;
      switch (result.status) {
        case "ready":
          notice = "QRIS siap. Menyinkronkan kode pembayaran terbaru...";
          break;
        case "processing":
          notice = "QRIS sedang diproses. Kode akan muncul setelah tersedia. Jika belum muncul, coba periksa lagi setelah jeda.";
          break;
        case "rate_limited":
          notice = "Permintaan terlalu sering. Tunggu hingga tombol tersedia untuk mencoba lagi.";
          break;
        case "unavailable":
          notice = "QRIS belum dapat disediakan. Coba lagi nanti atau hubungi pengelola kos.";
          break;
      }
    } catch {
      if (page.params.token !== token) return;
      retryAt = Date.now() + 30000;
      notice = "Koneksi terputus. Periksa koneksi, lalu coba lagi setelah jeda. Jangan membayar dua kali.";
    } finally {
      if (page.params.token === token) requesting = false;
    }
  }
</script>

<svelte:head>
  <title>Bayar tagihan | Paviliun</title>
  <meta name="robots" content="noindex,nofollow" />
  <meta
    name="description"
    content="Halaman pembayaran tagihan kos melalui QRIS."
  />
</svelte:head>
<header class="border-b border-line/70 bg-paper/90">
  <div class="mx-auto flex min-h-16 max-w-3xl items-center gap-3 px-4">
    <span
      class="grid size-9 place-items-center rounded-md bg-forest text-white"
    >
      <BuildingsIcon size={19} aria-hidden="true" />
    </span>
    <div>
      <p class="font-display text-lg font-semibold">Paviliun</p>
      <p class="text-[.68rem] text-muted">Pembayaran aman melalui QRIS</p>
    </div>
  </div>
</header>
<main class="mx-auto max-w-3xl px-4 py-8 sm:py-12">
  {#if validToken && payment.isLoading}<Skeleton
      rows={7}
    />{:else if payment.error}<QueryError
      message="Informasi pembayaran belum dapat dimuat."
    />{:else if !payment.data}<section
      class="surface rounded-xl p-7 text-center"
    >
      <WarningIcon size={36} class="mx-auto text-clay" aria-hidden="true" />
      <h1 class="font-display balance mt-5 text-3xl font-semibold">
        Tautan tidak tersedia
      </h1>
      <p class="pretty mt-3 text-sm leading-6 text-muted">
        Tautan mungkin sudah kedaluwarsa, dicabut oleh pengelola, atau alamatnya
        tidak tepat. Minta tautan pembayaran terbaru kepada pengelola kos.
      </p>
    </section>{:else}<section class="surface overflow-hidden rounded-xl">
      <div class="bg-forest px-5 py-6 text-white sm:px-8">
        <p class="text-xs font-bold uppercase tracking-[.13em] text-white/65">
          {payment.data.organizationName}
        </p>
        <h1 class="font-display balance mt-2 text-3xl font-semibold">
          Tagihan {payment.data.propertyName}
        </h1>
        <p class="mt-2 text-sm text-white/75">
          Kamar {payment.data.roomNumber} · {payment.data.invoice.number}
        </p>
      </div>
      <div class="p-5 sm:p-8">
        <div
          class="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-start"
        >
          <div>
            <p class="text-sm text-muted">Jumlah yang dibayar</p>
            <p class="font-display tabular mt-1 text-3xl font-semibold">
              {formatCurrency(payment.data.invoice.total)}
            </p>
            <p class="mt-2 text-xs text-muted">
              Periode {formatPeriod(payment.data.invoice.period)} · jatuh tempo {formatDate(
                payment.data.invoice.dueAt,
              )}
            </p>
          </div>
          <StatusBadge status={payment.data.invoice.status} />
        </div>
        {#if payment.data.invoice.status === "paid"}<div
            class="py-10 text-center"
          >
            <CheckCircleIcon
              size={48}
              weight="duotone"
              class="mx-auto text-forest"
              aria-hidden="true"
            />
            <h2 class="font-display mt-4 text-2xl font-semibold">
              Pembayaran sudah diterima
            </h2>
            <p
              class="pretty mx-auto mt-2 max-w-md text-sm leading-6 text-muted"
            >
              Tagihan ini sudah lunas. Simpan nomor tagihan di atas bila Anda
              perlu menghubungi pengelola.
            </p>
          </div>{:else if payment.data.qris?.qrString && !qrisExpired}<div
            class="py-7 text-center"
          >
            <p class="text-xs font-bold uppercase tracking-[.12em] text-clay">
              Pindai untuk membayar
            </p>
            <h2 class="font-display mt-2 text-2xl font-semibold">QRIS</h2>
            <div class="mt-5">
              <QrImage
                value={payment.data.qris.qrString}
                alt={`Kode QRIS tagihan ${payment.data.invoice.number}`}
              />
            </div>
            <p
              class="mt-4 flex items-center justify-center gap-2 text-xs text-muted"
            >
              <ClockIcon size={15} aria-hidden="true" />Berlaku sampai {formatDateTime(
                payment.data.qris.expiresAt,
              )}
            </p>
            <ol
              class="pretty mx-auto mt-7 max-w-md space-y-2 text-start text-sm leading-6 text-muted"
            >
              <li>
                1. Buka aplikasi bank atau dompet digital yang mendukung QRIS.
              </li>
              <li>
                2. Pindai kode dan pastikan jumlahnya sesuai dengan tagihan.
              </li>
              <li>
                3. Selesaikan pembayaran. Status halaman akan diperbarui setelah
                konfirmasi diterima.
              </li>
            </ol>
          </div>{:else}<div class="py-10 text-center">
            <QrCodeIcon
              size={44}
              class="mx-auto text-clay"
              aria-hidden="true"
            />
            <h2 class="font-display mt-4 text-2xl font-semibold">
              {qrisExpired ? "QRIS sudah kedaluwarsa" : "QRIS belum tersedia"}
            </h2>
            <p
              class="pretty mx-auto mt-2 max-w-md text-sm leading-6 text-muted"
            >
              {qrisExpired
                ? "Buat kode baru sebelum membayar. Jangan gunakan tangkapan layar kode yang sudah lewat masa berlaku."
                : "Siapkan kode pembayaran untuk tagihan ini. Anda tidak perlu membuat akun."}
            </p>
            <Button class="mt-5" onclick={requestQris} disabled={requesting || retrySeconds > 0}>
              {requesting ? "Menyiapkan QRIS..." : retrySeconds > 0 ? `Coba lagi dalam ${retrySeconds} detik` : notice ? "Periksa QRIS lagi" : qrisExpired ? "Buat QRIS baru" : "Siapkan QRIS"}
            </Button>
          </div>{/if}
        <p class="mb-5 text-center text-sm leading-6 text-muted" role="status">
          {payment.data.invoice.status !== "paid" && (!payment.data.qris || qrisExpired) ? notice : ""}
        </p>
        <div class="rounded-lg bg-forest-soft p-4">
          <p class="flex items-center gap-2 text-sm font-semibold text-forest">
            <ShieldCheckIcon size={18} aria-hidden="true" />Periksa sebelum
            membayar
          </p>
          <p class="pretty mt-1 text-xs leading-5 text-muted">
            Halaman ini tidak meminta NIK, kata sandi, PIN, atau kode OTP.
            Detail penghuni sengaja tidak ditampilkan untuk menjaga privasi.
          </p>
        </div>
        <div class="mt-7">
          <h2 class="text-sm font-semibold">Rincian tagihan</h2>
          <dl class="mt-3 divide-y divide-line">
            {#each payment.data.items as item, i (`${item.description}-${i}`)}<div
                class="flex justify-between gap-5 py-3 text-sm"
              >
                <dt>
                  <span>{item.description}</span>
                  <span class="block text-xs text-muted">
                    {item.quantity} × {formatCurrency(item.unitAmount)}
                  </span>
                </dt>
                <dd class="tabular font-semibold">
                  {formatCurrency(item.amount)}
                </dd>
              </div>{/each}
          </dl>
        </div>
      </div>
    </section>{/if}
</main>
<footer
  class="mx-auto max-w-3xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-muted"
>
  Paviliun · Operasional kos, tertata.
</footer>
