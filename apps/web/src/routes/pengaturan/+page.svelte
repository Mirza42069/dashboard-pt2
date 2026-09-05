<script lang="ts">
  import { PUBLIC_CONVEX_URL } from "$env/static/public";
  import { Tabs } from "bits-ui";
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import { useMutation, useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatDate, getErrorMessage, statusLabel } from "$lib/format";
  import Button from "$lib/components/Button.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import SelectField from "$lib/components/SelectField.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import { CheckCircleIcon, GearIcon, WarningIcon } from "phosphor-svelte";
  const org = getOrganization();
  const canView = $derived(["owner", "admin"].includes(org.membership?.role));
  const canEdit = $derived(org.membership?.role === "owner");
  const account = useQuery(api.xenditAccounts.get, () =>
    org.organization?._id && canView
      ? { organizationId: org.organization._id }
      : "skip",
  );
  const update = useMutation(api.xenditAccounts.update);
  const routingReady = $derived(Boolean(account.data?.verifiedAt && account.data.status === "active" && account.data.qrisEnabled));
  const hasRequest = $derived(Boolean(account.data?.requestedBusinessId));
  let businessId = $state("");
  let accountStatus = $state("active");
  let qrisEnabled = $state("yes");
  let initialized = $state(false);
  let submitting = $state(false);
  let error = $state("");
  let message = $state("");
  $effect(() => {
    if (account.data && !initialized) {
      businessId = account.data.requestedBusinessId ?? account.data.businessId;
      accountStatus = account.data.requestedStatus ?? account.data.status;
      qrisEnabled = (account.data.requestedQrisEnabled ?? account.data.qrisEnabled) ? "yes" : "no";
      initialized = true;
    }
  });
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id || !canEdit) return;
    if (!businessId.trim()) {
      error = "Masukkan ID bisnis Xendit.";
      return;
    }
    submitting = true;
    error = "";
    message = "";
    try {
      await update({
        organizationId: org.organization._id,
        businessId: businessId.trim(),
        status: accountStatus === "active" ? "active" : "inactive",
        qrisEnabled: qrisEnabled === "yes",
      });
      message = "Permintaan verifikasi tersimpan. Konfigurasi pembayaran yang berlaku belum berubah. Hubungi operator untuk verifikasi kepemilikan akun.";
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head><title>Pengaturan | Paviliun</title></svelte:head><PageHeader
  eyebrow="Ruang kerja"
  title="Pengaturan"
  description="Tinjau organisasi dan kesiapan integrasi pembayaran QRIS."
/>
<Tabs.Root value="workspace">
  <Tabs.List class="tab-list" aria-label="Bagian pengaturan">
    <Tabs.Trigger class="tab-trigger" value="workspace">
      Organisasi & pembayaran
    </Tabs.Trigger><Tabs.Trigger class="tab-trigger" value="technical">
      Kesiapan integrasi
    </Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="workspace">
    <div class="grid gap-9 xl:grid-cols-[.8fr_1.2fr]">
      <section class="border-t-2 border-forest/40 py-7">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[.12em] text-clay">
              Profil organisasi
            </p>
            <h2 class="font-display mt-1 text-2xl font-semibold">
              {org.organization?.name}
            </h2>
          </div>
          <GearIcon size={24} class="text-forest" aria-hidden="true" />
        </div>
        <dl class="mt-6 space-y-4 text-sm">
          <div>
            <dt class="text-xs text-muted">Peran Anda</dt>
            <dd class="mt-1 font-semibold">
              {statusLabel(org.membership?.role ?? "-")}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Zona waktu</dt>
            <dd class="mt-1 font-semibold">{org.organization?.timezone}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Mata uang</dt>
            <dd class="mt-1 font-semibold">{org.organization?.currency}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Dibuat</dt>
            <dd class="mt-1 font-semibold">
              {formatDate(org.organization?.createdAt)}
            </dd>
          </div>
        </dl>
        <p
          class="pretty mt-6 rounded-md bg-canvas p-3 text-xs leading-5 text-muted"
        >
          Nama organisasi bersifat tetap dan belum dapat diubah melalui halaman
          ini.
        </p>
      </section>
      <section class="surface rounded-lg p-7 sm:p-9">
        <p class="text-xs font-bold uppercase tracking-[.12em] text-clay">
          Penerimaan QRIS
        </p>
        <h2 class="font-display mt-1 text-2xl font-semibold">Akun Xendit</h2>
        {#if !canView}<div class="mt-6 rounded-md bg-clay-soft p-4">
            <p class="font-semibold text-danger">
              Akses pemilik atau admin diperlukan
            </p>
            <p class="mt-1 text-sm leading-6 text-muted">
              Staf tidak dapat melihat atau mengubah identitas akun pembayaran.
            </p>
          </div>{:else if account.isLoading}<div class="mt-5">
            <Skeleton rows={3} />
          </div>{:else if account.error}<div class="mt-5">
            <QueryError message="Konfigurasi Xendit belum dapat dimuat." />
          </div>{:else}
          <div class="mt-6 rounded-md border border-line bg-canvas p-5">
            <p class="text-sm font-semibold">{routingReady ? "Penerimaan QRIS terverifikasi dan aktif" : "Penerimaan QRIS belum aktif"}</p>
            <dl class="mt-4 space-y-3 text-sm">
              <div><dt class="text-xs text-muted">ID bisnis yang berlaku</dt><dd class="mt-1 break-all">{account.data?.businessId || "Belum ditetapkan"}</dd></div>
              <div><dt class="text-xs text-muted">Verifikasi kepemilikan</dt><dd class="mt-1">{account.data?.verifiedAt ? `Terverifikasi pada ${formatDate(account.data.verifiedAt)}` : "Menunggu verifikasi operator"}</dd></div>
              <div><dt class="text-xs text-muted">Status akun / QRIS yang berlaku</dt><dd class="mt-1">{account.data?.status === "active" ? "Aktif" : "Nonaktif"} / {account.data?.qrisEnabled ? "Diaktifkan" : "Dinonaktifkan"}</dd></div>
            </dl>
            <p class="mt-4 text-xs leading-6 text-muted">Menyimpan formulir hanya mengajukan konfigurasi. Aktivasi, penonaktifan, dan perubahan tujuan pembayaran memerlukan tindak lanjut operator; bukan berlaku langsung.</p>
            {#if hasRequest}<p class="mt-3 text-xs leading-6 text-muted">Permintaan terakhir: {account.data?.requestedBusinessId}, akun {account.data?.requestedStatus === "active" ? "aktif" : "nonaktif"}, QRIS {account.data?.requestedQrisEnabled ? "diaktifkan" : "dinonaktifkan"}. Catatan permintaan bukan bukti bahwa perubahan sudah diterapkan.</p>{/if}
          </div>
          <form class="mt-8 space-y-6" onsubmit={submit}>
            <FormField
              label="ID bisnis yang diajukan"
              name="businessId"
              required
              hint="Gunakan Business ID dari dasbor Xendit, bukan secret key."
            >
              {#snippet children({ id, describedby })}<Input
                  {id}
                  name="businessId"
                  bind:value={businessId}
                  placeholder="business-id-xendit"
                  disabled={!canEdit || submitting}
                  aria-describedby={describedby}
                />{/snippet}
            </FormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Status akun yang diajukan"
                name="status"
                bind:value={accountStatus}
                disabled={!canEdit || submitting}
                options={[
                  { value: "active", label: "Aktif" },
                  { value: "inactive", label: "Nonaktif" },
                ]}
              /><SelectField
                label="Penerimaan QRIS yang diajukan"
                name="qrisEnabled"
                bind:value={qrisEnabled}
                disabled={!canEdit || submitting}
                options={[
                  { value: "yes", label: "Diaktifkan" },
                  { value: "no", label: "Dinonaktifkan" },
                ]}
              />
            </div>
            <div class="min-h-6" role="status" aria-live="polite">
              {#if error}<p class="text-sm text-danger">
                  {error}
                </p>{:else if message}<p class="text-sm text-forest">
                  {message}
                </p>{/if}
            </div>
            {#if canEdit}<Button type="submit" disabled={submitting}>
                {submitting ? "Mengajukan..." : "Ajukan verifikasi konfigurasi"}
              </Button>{:else}<p class="text-sm text-muted">
                Hanya pemilik yang dapat menyimpan perubahan.
              </p>{/if}
          </form>{/if}
      </section>
    </div>
  </Tabs.Content>
  <Tabs.Content value="technical">
    <section
      class="surface mt-6 rounded-lg p-6"
      aria-labelledby="checklist-title"
    >
      <h2 id="checklist-title" class="font-display text-xl font-semibold">
        Daftar kesiapan lingkungan
      </h2>
      <p class="mt-1 text-sm text-muted">
        Nilai rahasia tidak pernah ditampilkan di browser.
      </p>
      <ul class="mt-5 grid gap-3 md:grid-cols-2">
        <li class="flex gap-3 rounded-md bg-canvas p-4">
          {#if PUBLIC_CONVEX_URL && !PUBLIC_CONVEX_URL.includes("example")}<CheckCircleIcon
              size={21}
              class="shrink-0 text-forest"
              aria-hidden="true"
            />{:else}<WarningIcon
              size={21}
              class="shrink-0 text-clay"
              aria-hidden="true"
            />{/if}
          <div>
            <p class="text-sm font-semibold">PUBLIC_CONVEX_URL</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              {PUBLIC_CONVEX_URL && !PUBLIC_CONVEX_URL.includes("example")
                ? "URL deployment tersedia."
                : "Masih memakai URL contoh; hubungkan deployment Convex."}
            </p>
          </div>
        </li>
        <li class="flex gap-3 rounded-md bg-canvas p-4">
          {#if routingReady}<CheckCircleIcon
              size={21}
              class="shrink-0 text-forest"
              aria-hidden="true"
            />{:else}<WarningIcon
              size={21}
              class="shrink-0 text-clay"
              aria-hidden="true"
            />{/if}
          <div>
            <p class="text-sm font-semibold">Verifikasi akun Xendit</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              {!canView ? "Hanya pemilik atau admin yang dapat memeriksa status ini." : routingReady
                ? "Akun terverifikasi, aktif, dan diizinkan menerima QRIS."
                : "Belum siap menerima QRIS. Pengajuan tidak otomatis mengaktifkan pembayaran."}
            </p>
          </div>
        </li>
        <li class="flex gap-3 rounded-md bg-canvas p-4">
          <WarningIcon
            size={21}
            class="shrink-0 text-clay"
            aria-hidden="true"
          />
          <div>
            <p class="text-sm font-semibold">XENDIT_SECRET_KEY</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              Harus dikonfigurasi pada environment backend Convex. Kesiapannya
              baru teruji saat membuat QRIS.
            </p>
          </div>
        </li>
        <li class="flex gap-3 rounded-md bg-canvas p-4">
          <WarningIcon
            size={21}
            class="shrink-0 text-clay"
            aria-hidden="true"
          />
          <div>
            <p class="text-sm font-semibold">Webhook Xendit</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              Arahkan webhook pembayaran ke endpoint Convex dan samakan
              verification token di backend.
            </p>
          </div>
        </li>
        <li class="flex gap-3 rounded-md bg-canvas p-4">
          <WarningIcon
            size={21}
            class="shrink-0 text-clay"
            aria-hidden="true"
          />
          <div>
            <p class="text-sm font-semibold">PUBLIC_CONVEX_SITE_URL</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              Diperlukan aplikasi web untuk meneruskan endpoint Better Auth ke
              Convex.
            </p>
          </div>
        </li>
        <li class="flex gap-3 rounded-md bg-canvas p-4">
          <WarningIcon
            size={21}
            class="shrink-0 text-clay"
            aria-hidden="true"
          />
          <div>
            <p class="text-sm font-semibold">SITE_URL dan Google OAuth</p>
            <p class="mt-1 text-xs leading-5 text-muted">
              Konfigurasikan SITE_URL di Convex; tambahkan GOOGLE_CLIENT_ID dan
              GOOGLE_CLIENT_SECRET bila login Google digunakan.
            </p>
          </div>
        </li>
      </ul>
    </section>
  </Tabs.Content>
</Tabs.Root>
