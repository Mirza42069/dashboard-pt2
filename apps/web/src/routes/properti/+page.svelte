<script lang="ts">
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import type { Doc, Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
  import TableScroll from "$lib/components/TableScroll.svelte";
  import { useMutation, useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatCurrency, getErrorMessage, statusLabel } from "$lib/format";
  import AppDialog from "$lib/components/AppDialog.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import SelectField from "$lib/components/SelectField.svelte";
  import { BuildingsIcon, MapPinIcon, PlusIcon } from "phosphor-svelte";
  const org = getOrganization();
  const properties = useQuery(api.properties.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const rooms = useQuery(api.rooms.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const createProperty = useMutation(api.properties.create);
  const createRoom = useMutation(api.rooms.create);
  const updateRoomStatus = useMutation(api.rooms.updateStatus);
  let propertyOpen = $state(false);
  let roomOpen = $state(false);
  let submitting = $state(false);
  let statusBusy = $state("");
  let message = $state("");
  let error = $state("");
  let roomPropertyId = $state("");
  const canAdmin = $derived(["owner", "admin"].includes(org.membership?.role));
  const propertyOptions = $derived(
    (properties.data ?? []).map((p: any) => ({ value: p._id, label: p.name })),
  );
  const grouped = $derived(
    (properties.data ?? []).map((property: any) => ({
      property,
      rooms: (rooms.data ?? []).filter(
        (room: any) => room.propertyId === property._id,
      ),
    })),
  );
  async function submitProperty(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const address = String(data.get("address") ?? "").trim();
    const city = String(data.get("city") ?? "").trim();
    error = "";
    if (!name || !address || !city) {
      error = "Lengkapi nama, alamat, dan kota properti.";
      return;
    }
    submitting = true;
    try {
      await createProperty({
        organizationId: org.organization._id,
        name,
        address,
        city,
      });
      propertyOpen = false;
      message = "Properti berhasil ditambahkan.";
      form.reset();
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
  async function submitRoom(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const number = String(data.get("number") ?? "").trim();
    const floor = String(data.get("floor") ?? "").trim();
    const monthlyRate = Number(data.get("monthlyRate"));
    error = "";
    if (
      !roomPropertyId ||
      !number ||
      !Number.isSafeInteger(monthlyRate) ||
      monthlyRate < 0
    ) {
      error =
        "Pilih properti, isi nomor kamar, dan masukkan harga rupiah bulat.";
      return;
    }
    submitting = true;
    try {
      await createRoom({
        organizationId: org.organization._id,
        propertyId: roomPropertyId as Id<"properties">,
        number,
        floor: floor || undefined,
        monthlyRate,
      });
      roomOpen = false;
      message = "Kamar berhasil ditambahkan.";
      roomPropertyId = "";
      form.reset();
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
  async function changeStatus(roomId: string, status: string) {
    if (!org.organization?._id) return;
    statusBusy = roomId;
    error = "";
    try {
      await updateRoomStatus({
        organizationId: org.organization._id,
        roomId: roomId as Id<"rooms">,
        status: status as Doc<"rooms">["status"],
      });
      message = `Status kamar diubah menjadi ${statusLabel(status).toLowerCase()}.`;
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      statusBusy = "";
    }
  }
</script>

<svelte:head><title>Properti dan kamar | Paviliun</title></svelte:head>
<PageHeader
  eyebrow="Inventaris hunian"
  title="Properti dan kamar"
  description="Susun kamar per alamat dan jaga status ketersediaannya tetap mutakhir."
>
  {#snippet actions()}{#if canAdmin}<Button
        variant="secondary"
        onclick={() => {
          error = "";
          roomOpen = true;
        }}
      >
        <PlusIcon size={17} aria-hidden="true" />Tambah kamar
      </Button><Button
        onclick={() => {
          error = "";
          propertyOpen = true;
        }}
      >
        <PlusIcon size={17} aria-hidden="true" />Tambah properti
      </Button>{/if}{/snippet}
</PageHeader>
<div class="mb-4 min-h-6" role="status" aria-live="polite">
  {#if error}<p class="text-sm text-danger">{error}</p>{:else if message}<p
      class="text-sm text-forest"
    >
      {message}
    </p>{/if}
</div>
{#if properties.isLoading || rooms.isLoading}<Skeleton
    rows={6}
  />{:else if properties.error || rooms.error}<QueryError
    message="Daftar properti dan kamar belum dapat dimuat."
  />{:else if !properties.data?.length}<EmptyState
    icon={BuildingsIcon}
    title="Belum ada properti"
    description="Tambahkan alamat kos pertama, lalu catat kamar yang tersedia di dalamnya."
  >
    {#snippet action()}{#if canAdmin}<Button
          onclick={() => (propertyOpen = true)}
        >
          Tambah properti pertama
        </Button>{/if}{/snippet}
  </EmptyState>{:else}<div class="space-y-6">
    {#each grouped as group (group.property._id)}<section
        class="surface overflow-hidden rounded-lg"
        aria-labelledby={`property-${group.property._id}`}
      >
        <header
          class="flex flex-col gap-4 border-b border-line p-7 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2
              id={`property-${group.property._id}`}
              class="font-display text-2xl font-medium"
            >
              {group.property.name}
            </h2>
            <p class="mt-1 flex items-center gap-1.5 text-sm text-muted">
              <MapPinIcon size={15} aria-hidden="true" />{group.property
                .address}, {group.property.city}
            </p>
          </div>
          <p class="tabular text-sm font-semibold">
            {group.rooms.length} kamar
          </p>
        </header>
        {#if group.rooms.length}<TableScroll label={`Daftar kamar ${group.property.name}`} class="hidden md:block">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kamar</th>
                  <th>Lantai</th>
                  <th>Harga bulanan</th>
                  <th>Status</th>
                  <th><span class="sr-only">Ubah status</span></th>
                </tr>
              </thead>
              <tbody>
                {#each group.rooms as room (room._id)}<tr>
                    <td class="font-semibold">{room.number}</td>
                    <td>{room.floor || "-"}</td>
                    <td class="tabular">{formatCurrency(room.monthlyRate)}</td>
                    <td><StatusBadge status={room.status} /></td>
                    <td class="text-end">
                      <label class="sr-only" for={`status-${room._id}`}>
                        Status kamar {room.number}
                      </label>
                      <select
                        id={`status-${room._id}`}
                        class="min-h-10 rounded-md border border-line bg-white px-2 text-sm"
                        value={room.status}
                        disabled={statusBusy === room._id}
                        onchange={(e) =>
                          changeStatus(room._id, e.currentTarget.value)}
                      >
                        <option value="available">Tersedia</option>
                        <option value="occupied">Terisi</option>
                        <option value="maintenance">Pemeliharaan</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                    </td>
                  </tr>{/each}
              </tbody>
            </table>
          </TableScroll>
          <div class="divide-y divide-line md:hidden">
            {#each group.rooms as room (room._id)}<article class="p-4">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="font-semibold">Kamar {room.number}</h3>
                    <p class="tabular mt-1 text-sm text-muted">
                      {formatCurrency(room.monthlyRate)} / bulan
                    </p>
                  </div>
                  <StatusBadge status={room.status} />
                </div>
                <label
                  class="field-label mt-4"
                  for={`mobile-status-${room._id}`}
                >
                  Ubah status
                </label>
                <select
                  id={`mobile-status-${room._id}`}
                  class="input-base"
                  value={room.status}
                  disabled={statusBusy === room._id}
                  onchange={(e) =>
                    changeStatus(room._id, e.currentTarget.value)}
                >
                  <option value="available">Tersedia</option>
                  <option value="occupied">Terisi</option>
                  <option value="maintenance">Pemeliharaan</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </article>{/each}
          </div>{:else}<p class="p-5 text-sm text-muted">
            Belum ada kamar pada properti ini.
          </p>{/if}
      </section>{/each}
  </div>{/if}
<AppDialog
  bind:open={propertyOpen}
  title="Tambah properti"
  description="Catat satu alamat pengelolaan baru."
>
  <form class="space-y-4" onsubmit={submitProperty}>
    {#each [{ name: "name", label: "Nama properti", placeholder: "Kos Cempaka" }, { name: "address", label: "Alamat lengkap", placeholder: "Jl. Cempaka No. 12" }, { name: "city", label: "Kota", placeholder: "Bandung" }] as field (field.name)}<FormField
        label={field.label}
        name={field.name}
        required
      >
        {#snippet children({ id, describedby })}<Input
            {id}
            name={field.name}
            placeholder={field.placeholder}
            aria-describedby={describedby}
          />{/snippet}
      </FormField>{/each}
    <p class="min-h-5 text-sm text-danger" role="status">
      {propertyOpen ? error : ""}
    </p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (propertyOpen = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan properti"}
      </Button>
    </div>
  </form>
</AppDialog>
<AppDialog
  bind:open={roomOpen}
  title="Tambah kamar"
  description="Kamar baru dimulai dengan status tersedia."
>
  <form class="space-y-4" onsubmit={submitRoom}>
    <SelectField
      label="Properti"
      name="propertyId"
      options={propertyOptions}
      bind:value={roomPropertyId}
      required
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField label="Nomor kamar" name="number" required>
        {#snippet children({ id, describedby })}<Input
            {id}
            name="number"
            placeholder="A-03"
            aria-describedby={describedby}
          />{/snippet}
      </FormField><FormField label="Lantai" name="floor">
        {#snippet children({ id, describedby })}<Input
            {id}
            name="floor"
            placeholder="2"
            aria-describedby={describedby}
          />{/snippet}
      </FormField>
    </div>
    <FormField
      label="Harga sewa bulanan"
      name="monthlyRate"
      required
      hint="Masukkan rupiah tanpa tanda baca."
    >
      {#snippet children({ id, describedby })}<Input
          {id}
          name="monthlyRate"
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          placeholder="1500000"
          aria-describedby={describedby}
        />{/snippet}
    </FormField>
    <p class="min-h-5 text-sm text-danger" role="status">
      {roomOpen ? error : ""}
    </p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (roomOpen = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan kamar"}
      </Button>
    </div>
  </form>
</AppDialog>
