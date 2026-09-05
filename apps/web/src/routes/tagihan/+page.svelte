<script lang="ts">
  import { browser } from "$app/environment";
  import { AlertDialog } from "bits-ui";
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import type { Doc, Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
  import { useAction, useMutation, useQuery } from "convex-svelte";
  import QRCode from "qrcode";
  import { getOrganization } from "$lib/organization.svelte";
  import {
    currentPeriod,
    dateInputToTimestamp,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatPeriod,
    getErrorMessage,
    phoneForWhatsApp,
  } from "$lib/format";
  import AppDialog from "$lib/components/AppDialog.svelte";
  import TableScroll from "$lib/components/TableScroll.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import SelectField from "$lib/components/SelectField.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import {
    CopyIcon,
    DownloadIcon,
    PlusIcon,
    QrCodeIcon,
    ReceiptIcon,
    WhatsappLogoIcon,
  } from "phosphor-svelte";
  const org = getOrganization();
  let filter = $state("all");
  const invoices = useQuery(api.invoices.list, () =>
    org.organization?._id
      ? {
          organizationId: org.organization._id,
          status: filter === "all" ? undefined : filter as Doc<"invoices">["status"],
        }
      : "skip",
  );
  const leases = useQuery(api.leases.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const createInvoice = useMutation(api.invoices.create);
  const generateMonthly = useMutation(api.invoices.generateMonthly);
  const createLink = useMutation(api.publicPayments.createLink);
  const createQris = useAction(api.payments.createQris);
  let confirmOpen = $state(false);
  let manualOpen = $state(false);
  let qrOpen = $state(false);
  let submitting = $state(false);
  let generating = $state(false);
  let actionBusy = $state("");
  let qrNotice = $state("");
  let qrRetryAt = $state(0);
  let now = $state(Date.now());
  $effect(() => {
    const timer = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(timer);
  });
  const retrySeconds = $derived(Math.max(0, Math.ceil((qrRetryAt - now) / 1000)));
  let error = $state("");
  let message = $state("");
  let period = $state(currentPeriod());
  let leaseId = $state("");
  let qrState = $state<{
    invoice: any;
    link: any;
    request: Awaited<ReturnType<typeof createQris>> | null;
    url: string;
    dataUrl: string;
  }>({ invoice: null, link: null, request: null, url: "", dataUrl: "" });
  const qrValid = $derived(qrState.request?.status === "ready" && qrState.request.expiresAt > now && Boolean(qrState.dataUrl));
  const leaseOptions = $derived(
    (leases.data ?? [])
      .filter((l: any) => l.status === "active")
      .map((l: any) => ({
        value: l._id,
        label: `${l.tenant?.fullName ?? "Penghuni"} — ${l.property?.name ?? ""} / Kamar ${l.room?.number ?? ""}`,
      })),
  );
  const canAdmin = $derived(["owner", "admin"].includes(org.membership?.role));
  async function generate() {
    if (!canAdmin) {
      error =
        "Penerbitan tagihan bulanan hanya tersedia untuk pemilik atau admin.";
      return;
    }
    if (!org.organization?._id || !/^(\d{4})-(0[1-9]|1[0-2])$/.test(period)) {
      error = "Gunakan periode dengan format bulan dan tahun yang valid.";
      return;
    }
    generating = true;
    error = "";
    try {
      const result = await generateMonthly({
        organizationId: org.organization._id,
        period,
      });
      message = result.created
        ? `${result.created} tagihan ${formatPeriod(result.period)} berhasil dibuat.`
        : `Tidak ada tagihan baru untuk ${formatPeriod(result.period)}.`;
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      generating = false;
    }
  }
  async function submitManual(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const d = new FormData(event.currentTarget as HTMLFormElement);
    const invoicePeriod = String(d.get("period") ?? ""),
      dueAt = dateInputToTimestamp(String(d.get("dueAt") ?? "")),
      description = String(d.get("description") ?? "").trim(),
      quantity = Number(d.get("quantity")),
      unitAmount = Number(d.get("unitAmount"));
    if (
      !leaseId ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(invoicePeriod) ||
      !Number.isFinite(dueAt) ||
      !description ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !Number.isSafeInteger(unitAmount) ||
      unitAmount < 1
    ) {
      error =
        "Lengkapi kontrak, periode, jatuh tempo, dan rincian tagihan dengan nilai yang valid.";
      return;
    }
    submitting = true;
    error = "";
    try {
      await createInvoice({
        organizationId: org.organization._id,
        leaseId: leaseId as Id<"leases">,
        period: invoicePeriod,
        dueAt,
        items: [{ description, quantity, unitAmount }],
      });
      manualOpen = false;
      message = "Tagihan manual berhasil dibuat.";
      leaseId = "";
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
  async function preparePayment(invoice: any, withQris: boolean) {
    if (actionBusy || (withQris && retrySeconds > 0)) return;
    if (!canAdmin) {
      error =
        "Tautan pembayaran dan QRIS hanya dapat dibuat oleh pemilik atau admin.";
      return;
    }
    if (!org.organization?._id || !browser) return;
    actionBusy = invoice._id;
    error = "";
    qrNotice = "";
    message = "";
    try {
      const link = await createLink({
        organizationId: org.organization._id,
        invoiceId: invoice._id,
      });
      if (!link) throw new Error("Tautan pembayaran belum tersedia. Coba lagi.");
      const url = `${location.origin}/bayar/${link.token}`;
      let request = null;
      let dataUrl = "";
      if (withQris) {
        request = await createQris({
          organizationId: org.organization._id,
          invoiceId: invoice._id,
          paymentLinkId: link._id,
        });
        qrRetryAt = Date.now() + 30000;
        if (request.status !== "ready") {
          const notices = {
            processing: "QRIS sedang diproses. Tunggu sebentar, lalu coba lagi.",
            rate_limited: "Permintaan QRIS terlalu sering. Tunggu sebentar sebelum mencoba lagi.",
            unavailable: "QRIS belum tersedia. Periksa kesiapan akun pembayaran di Pengaturan.",
          };
          qrNotice = notices[request.status];
        } else dataUrl = await QRCode.toDataURL(request.qrString, {
          width: 420,
          margin: 2,
          color: { dark: "#173e2b", light: "#ffffff" },
        });
      }
      qrState = { invoice, link, request, url, dataUrl };
      qrOpen = true;
      message = request?.status === "ready"
        ? "QRIS siap dibagikan."
        : "Tautan pembayaran siap dibagikan.";
    } catch (cause) {
      error = getErrorMessage(cause);
      if (withQris) qrRetryAt = Date.now() + 30000;
      qrNotice = error;
    } finally {
      actionBusy = "";
    }
  }
  async function copyLink() {
    if (!browser || !qrState.url) return;
    try {
      await navigator.clipboard.writeText(qrState.url);
      message = "Tautan pembayaran disalin.";
      qrNotice = message;
    } catch {
      error =
        "Tautan tidak dapat disalin otomatis. Pilih teks tautan dan salin secara manual.";
      qrNotice = error;
    }
  }
  const whatsappUrl = $derived(
    qrState.url
      ? `https://wa.me/${phoneForWhatsApp(qrState.invoice?.tenant?.phone)}?text=${encodeURIComponent(`Halo, berikut tautan pembayaran tagihan ${qrState.invoice?.number} sebesar ${formatCurrency(qrState.invoice?.total)}: ${qrState.url}`)}`
      : "",
  );
</script>

<svelte:head><title>Tagihan | Paviliun</title></svelte:head>
<PageHeader
  eyebrow="Piutang sewa"
  title="Tagihan"
  description="Terbitkan tagihan, buat tautan publik, dan siapkan QRIS tanpa memberi akun kepada penghuni."
>
  {#snippet actions()}<Button
      variant="secondary"
      onclick={() => {
        error = "";
        manualOpen = true;
      }}
    >
      <PlusIcon size={17} aria-hidden="true" />Buat manual
    </Button>{/snippet}
</PageHeader>
<section
  class="surface mb-5 grid gap-4 rounded-lg p-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto] lg:items-end"
  aria-label="Kontrol tagihan"
>
  <SelectField
    label="Status tagihan"
    name="filter"
    bind:value={filter}
    options={[
      { value: "all", label: "Semua status" },
      { value: "pending", label: "Menunggu" },
      { value: "overdue", label: "Terlambat" },
      { value: "paid", label: "Lunas" },
      { value: "draft", label: "Draf" },
      { value: "void", label: "Dibatalkan" },
    ]}
  />{#if canAdmin}<FormField label="Periode tagihan bulanan" name="period">
      {#snippet children({ id, describedby })}<Input
          {id}
          type="month"
          bind:value={period}
          aria-describedby={describedby}
        />{/snippet}
    </FormField><Button
      onclick={() => (confirmOpen = true)}
      disabled={generating}
    >
      {generating ? "Menerbitkan..." : "Terbitkan bulanan"}
    </Button>{:else}<p class="self-end pb-3 text-sm text-muted lg:col-span-2">
      Staf dapat membuat tagihan manual. Penerbitan massal dan tautan bayar
      dikelola pemilik atau admin.
    </p>{/if}
</section>
{#if retrySeconds > 0 && !qrOpen}<p class="mb-4 text-xs text-muted">Pembuatan QRIS tersedia lagi dalam {retrySeconds} detik. Tautan pembayaran tetap dapat dibagikan.</p>{/if}
<AlertDialog.Root bind:open={confirmOpen}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay
      class="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]"
    />
    <AlertDialog.Content
      class="surface fixed start-1/2 top-1/2 z-50 w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl p-7 sm:p-9"
    >
      <p
        class="mb-4 text-[0.65rem] font-semibold uppercase tracking-widest text-forest"
      >
        Penerbitan bulanan
      </p>
      <AlertDialog.Title class="font-display text-3xl">
        Terbitkan tagihan {formatPeriod(period)}?
      </AlertDialog.Title>
      <AlertDialog.Description class="mt-4 text-sm leading-7 text-muted">
        Tagihan akan dibuat untuk seluruh kontrak aktif pada periode ini.
        Tagihan yang sudah ada tidak dibuat ulang. Periksa periode sebelum
        melanjutkan.
      </AlertDialog.Description>
      <div class="mt-7 flex flex-wrap justify-end gap-3">
        <AlertDialog.Cancel
          class="min-h-11 rounded-md border border-line bg-white px-4 text-sm font-semibold"
        >
          Periksa kembali
        </AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={() => {
            confirmOpen = false;
            void generate();
          }}
          class="min-h-11 rounded-md bg-forest px-4 text-sm font-semibold text-white"
        >
          Ya, terbitkan
        </AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
  <div class="mb-4 min-h-6" role="status" aria-live="polite">
  {#if error}<p class="text-sm text-danger">{error}</p>{:else if message}<p
      class="text-sm text-forest"
    >
      {message}
    </p>{/if}
</div>
{#if invoices.isLoading}<Skeleton
    rows={7}
  />{:else if invoices.error}<QueryError
    message="Daftar tagihan belum dapat dimuat."
  />{:else if !invoices.data?.length}<EmptyState
    icon={ReceiptIcon}
    title={filter === "all"
      ? "Belum ada tagihan"
      : "Tidak ada tagihan pada status ini"}
    description={filter === "all"
      ? "Terbitkan tagihan bulanan dari kontrak aktif atau buat satu tagihan manual."
      : "Pilih status lain untuk melihat catatan yang berbeda."}
  />{:else}<div class="surface overflow-hidden rounded-lg">
    <TableScroll label="Daftar tagihan" class="hidden lg:block">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nomor</th>
            <th>Penghuni / kamar</th>
            <th>Periode</th>
            <th>Jatuh tempo</th>
            <th>Total</th>
            <th>Status</th>
            <th><span class="sr-only">Tindakan</span></th>
          </tr>
        </thead>
        <tbody>
          {#each invoices.data as invoice (invoice._id)}<tr>
              <td class="font-semibold">{invoice.number}</td>
              <td>
                {invoice.tenant?.fullName ?? "-"}
                <p class="text-xs text-muted">
                  Kamar {invoice.room?.number ?? "-"}
                </p>
              </td>
              <td>{formatPeriod(invoice.period)}</td>
              <td>{formatDate(invoice.dueAt)}</td>
              <td class="tabular font-semibold">
                {formatCurrency(invoice.total)}
              </td>
              <td><StatusBadge status={invoice.status} /></td>
              <td>
                <div class="flex justify-end gap-2">
                  {#if ["pending", "overdue"].includes(invoice.status)}<Button
                      size="sm"
                      variant="secondary"
                      onclick={() => preparePayment(invoice, false)}
                      disabled={Boolean(actionBusy)}
                    >
                      Tautan
                    </Button><Button
                      size="sm"
                      onclick={() => preparePayment(invoice, true)}
                      disabled={Boolean(actionBusy) || retrySeconds > 0}
                    >
                      <QrCodeIcon size={16} aria-hidden="true" />{actionBusy ===
                      invoice._id
                        ? "Memproses..."
                        : "QRIS"}
                    </Button>{/if}
                </div>
              </td>
            </tr>{/each}
        </tbody>
      </table>
    </TableScroll>
    <div class="divide-y divide-line lg:hidden">
      {#each invoices.data as invoice (invoice._id)}<article class="p-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs text-muted">{invoice.number}</p>
              <h2 class="mt-1 font-semibold">
                {invoice.tenant?.fullName ?? "-"} · Kamar {invoice.room
                  ?.number ?? "-"}
              </h2>
            </div>
            <StatusBadge status={invoice.status} />
          </div>
          <p class="font-display tabular mt-4 text-xl font-semibold">
            {formatCurrency(invoice.total)}
          </p>
          <p class="mt-1 text-xs text-muted">
            {formatPeriod(invoice.period)} · jatuh tempo {formatDate(
              invoice.dueAt,
            )}
          </p>
          {#if ["pending", "overdue"].includes(invoice.status)}<div
              class="mt-4 flex gap-2"
            >
              <Button
                class="flex-1"
                variant="secondary"
                onclick={() => preparePayment(invoice, false)}
                disabled={Boolean(actionBusy)}
              >
                Buat tautan
              </Button><Button
                class="flex-1"
                onclick={() => preparePayment(invoice, true)}
                disabled={Boolean(actionBusy) || retrySeconds > 0}
              >
                Buat QRIS
              </Button>
            </div>{/if}
        </article>{/each}
    </div>
  </div>{/if}
<AppDialog
  bind:open={manualOpen}
  title="Buat tagihan manual"
  description="Satu tagihan manual berisi satu rincian. Tambahkan deskripsi yang mudah dikenali penghuni."
>
  <form class="space-y-4" onsubmit={submitManual}>
    <SelectField
      label="Kontrak aktif"
      name="leaseId"
      options={leaseOptions}
      bind:value={leaseId}
      required
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Periode" name="period" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="period"
            type="month"
            value={currentPeriod()}
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField label="Jatuh tempo" name="dueAt" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="dueAt"
            type="date"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <FormField label="Deskripsi rincian" name="description" required>
      {#snippet children({ id, describedby })}<Input
          {id}
          name="description"
          placeholder="Sewa kamar dan listrik"
          aria-describedby={describedby}
        />{/snippet}
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Jumlah" name="quantity" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="quantity"
            type="number"
            min="1"
            step="1"
            value="1"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField label="Harga satuan" name="unitAmount" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="unitAmount"
            type="number"
            min="1"
            step="1"
            inputmode="numeric"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <p class="min-h-5 text-sm text-danger" role="status">
      {manualOpen ? error : ""}
    </p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (manualOpen = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan tagihan"}
      </Button>
    </div>
  </form>
</AppDialog>
<AppDialog
  bind:open={qrOpen}
  title={qrState.request ? "QRIS pembayaran" : "Tautan pembayaran"}
  description={`Tagihan ${qrState.invoice?.number ?? ""} · ${formatCurrency(qrState.invoice?.total)}`}
>
  <div class="text-center">
    {#if qrValid}<img
        src={qrState.dataUrl}
        alt={`Kode QRIS untuk tagihan ${qrState.invoice?.number}`}
        class="mx-auto size-64 max-w-full rounded-lg bg-white p-2 outline outline-1 outline-black/10"
      />
      <p class="mt-3 text-xs text-muted">
        Berlaku sampai {formatDateTime(qrState.request?.status === "ready" ? qrState.request.expiresAt : undefined)}
      </p>{:else}<div
        class="mx-auto grid size-32 place-items-center rounded-lg bg-forest-soft"
      >
        <QrCodeIcon size={52} class="text-forest" aria-hidden="true" />
      </div>
      <p class="pretty mt-3 text-sm text-muted">
        {qrState.request?.status === "ready" ? "QRIS sudah kedaluwarsa. Buat kode baru sebelum membayar." : "Tautan dapat dibagikan. Penghuni dapat menyiapkan QRIS langsung dari halaman pembayaran."}
      </p>{/if}
    <p class="mt-4 text-sm leading-6 text-muted" role="status">{qrNotice}</p>
    {#if !qrValid}<Button class="mt-4" onclick={() => preparePayment(qrState.invoice, true)} disabled={Boolean(actionBusy) || retrySeconds > 0}>
      {actionBusy ? "Menyiapkan QRIS..." : retrySeconds > 0 ? `Coba lagi dalam ${retrySeconds} detik` : "Siapkan QRIS lagi"}
    </Button>{/if}
    <label class="field-label mt-6 text-start" for="payment-url">
      Tautan publik
    </label>
    <input
      id="payment-url"
      class="input-base tabular"
      readonly
      value={qrState.url}
    />
    <div class="mt-4 grid gap-2 sm:grid-cols-3">
      <Button variant="secondary" onclick={copyLink}>
        <CopyIcon size={17} aria-hidden="true" />Salin
      </Button>{#if qrValid}<Button
          href={qrState.dataUrl}
          download={`QRIS-${qrState.invoice?.number}.png`}
          variant="secondary"
        >
          <DownloadIcon size={17} aria-hidden="true" />Unduh
        </Button>{/if}<Button href={whatsappUrl} target="_blank">
        <WhatsappLogoIcon size={18} aria-hidden="true" />Bagikan
      </Button>
    </div>
    {#if !phoneForWhatsApp(qrState.invoice?.tenant?.phone)}<p
        class="mt-3 text-xs text-muted"
      >
        Nomor WhatsApp penghuni belum tercatat. Tombol bagikan akan membuka
        pemilih kontak.
      </p>{/if}
  </div>
</AppDialog>
