<script lang="ts">
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import type { Doc, Id } from "@my-better-t-app/backend/convex/_generated/dataModel";
  import { Tabs } from "bits-ui";
  import { useMutation, useQuery } from "convex-svelte";
  import { getOrganization } from "$lib/organization.svelte";
  import { formatDate, getErrorMessage, statusLabel } from "$lib/format";
  import AppDialog from "$lib/components/AppDialog.svelte";
  import Button from "$lib/components/Button.svelte";
  import EmptyState from "$lib/components/EmptyState.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import QueryError from "$lib/components/QueryError.svelte";
  import SelectField from "$lib/components/SelectField.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";
  import StatusBadge from "$lib/components/StatusBadge.svelte";
  import { PlusIcon, WrenchIcon } from "phosphor-svelte";
  const org = getOrganization();
  const tickets = useQuery(api.maintenance.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const properties = useQuery(api.properties.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const rooms = useQuery(api.rooms.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const tenants = useQuery(api.tenants.list, () =>
    org.organization?._id ? { organizationId: org.organization._id } : "skip",
  );
  const createTicket = useMutation(api.maintenance.create);
  const updateStatus = useMutation(api.maintenance.updateStatus);
  let open = $state(false);
  let submitting = $state(false);
  let busy = $state("");
  let error = $state("");
  let message = $state("");
  let propertyId = $state("");
  let roomId = $state("");
  let tenantId = $state("");
  let priority = $state("medium");
  let workTab = $state("active");
  const filteredTickets = $derived(
    (tickets.data ?? []).filter((ticket: any) =>
      workTab === "active"
        ? ["open", "in_progress"].includes(ticket.status)
        : ["resolved", "closed"].includes(ticket.status),
    ),
  );
  const propertyOptions = $derived(
    (properties.data ?? []).map((p: any) => ({ value: p._id, label: p.name })),
  );
  const roomOptions = $derived([
    { value: "none", label: "Tanpa kamar" },
    ...(rooms.data ?? [])
      .filter((r: any) => r.propertyId === propertyId)
      .map((r: any) => ({ value: r._id, label: `Kamar ${r.number}` })),
  ]);
  const tenantOptions = $derived([
    { value: "none", label: "Tanpa penghuni" },
    ...(tenants.data ?? []).map((t: any) => ({
      value: t._id,
      label: t.fullName,
    })),
  ]);
  const nameOf = (list: any[] | undefined, id: string, field = "name") =>
    list?.find((x: any) => x._id === id)?.[field] ?? "-";
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!org.organization?._id) return;
    const d = new FormData(event.currentTarget as HTMLFormElement);
    const title = String(d.get("title") ?? "").trim(),
      description = String(d.get("description") ?? "").trim();
    if (!propertyId || !title || !description) {
      error = "Pilih properti lalu lengkapi judul dan uraian pekerjaan.";
      return;
    }
    submitting = true;
    error = "";
    try {
      await createTicket({
        organizationId: org.organization._id,
        propertyId: propertyId as Id<"properties">,
        roomId: roomId && roomId !== "none" ? roomId as Id<"rooms"> : undefined,
        tenantId: tenantId && tenantId !== "none" ? tenantId as Id<"tenants"> : undefined,
        title,
        description,
        priority: priority as Doc<"maintenanceTickets">["priority"],
      });
      open = false;
      message = "Tiket pemeliharaan berhasil dibuat.";
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      submitting = false;
    }
  }
  async function change(ticketId: string, status: string) {
    if (!org.organization?._id) return;
    busy = ticketId;
    error = "";
    try {
      await updateStatus({
        organizationId: org.organization._id,
        ticketId: ticketId as Id<"maintenanceTickets">,
        status: status as Doc<"maintenanceTickets">["status"],
      });
      message = `Status pekerjaan diubah menjadi ${statusLabel(status).toLowerCase()}.`;
    } catch (cause) {
      error = getErrorMessage(cause);
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head><title>Pemeliharaan | Paviliun</title></svelte:head><PageHeader
  eyebrow="Papan pekerjaan"
  title="Pemeliharaan"
  description="Prioritaskan laporan kerusakan dan lacak pekerjaan sampai ditutup."
>
  {#snippet actions()}<Button
      onclick={() => {
        error = "";
        open = true;
      }}
    >
      <PlusIcon size={17} aria-hidden="true" />Buat tiket
    </Button>{/snippet}
</PageHeader>
<div class="mb-4 min-h-5" role="status" aria-live="polite">
  {#if error}<p class="text-sm text-danger">{error}</p>{:else if message}<p
      class="text-sm text-forest"
    >
      {message}
    </p>{/if}
</div>
<Tabs.Root bind:value={workTab}>
  <Tabs.List class="tab-list" aria-label="Kelompok pekerjaan">
    <Tabs.Trigger value="active" class="tab-trigger">
      Perlu dikerjakan
    </Tabs.Trigger><Tabs.Trigger value="completed" class="tab-trigger">
      Tuntas & ditutup
    </Tabs.Trigger>
  </Tabs.List>
  {#each ["active", "completed"] as tab (tab)}
    <Tabs.Content value={tab}>
      {#if tickets.isLoading || properties.isLoading || rooms.isLoading}<Skeleton
          rows={6}
        />{:else if tickets.error || properties.error || rooms.error}<QueryError
          message="Daftar pemeliharaan belum dapat dimuat."
        />{:else if !filteredTickets.length}<EmptyState
          icon={WrenchIcon}
          title={tab === "active"
            ? "Tidak ada pekerjaan terbuka"
            : "Belum ada pekerjaan tuntas"}
          description={tab === "active"
            ? "Buat tiket saat ada kerusakan atau pekerjaan perawatan yang perlu dilacak."
            : "Pekerjaan yang sudah tuntas atau ditutup akan tersimpan di sini."}
        >
          {#snippet action()}<Button onclick={() => (open = true)}>
              Buat tiket pertama
            </Button>{/snippet}
        </EmptyState>{:else}<div class="grid gap-6 xl:grid-cols-2">
          {#each filteredTickets as ticket (ticket._id)}<article
              class="surface rounded-lg p-7"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p
                    class="mb-2 text-xs font-bold uppercase tracking-[.1em] text-clay"
                  >
                    {statusLabel(ticket.priority)}
                  </p>
                  <h2 class="font-display text-2xl font-medium">
                    {ticket.title}
                  </h2>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
              <p class="pretty mt-3 text-sm leading-6 text-muted">
                {ticket.description}
              </p>
              <dl class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt class="text-xs text-muted">Lokasi</dt>
                  <dd class="mt-1 font-medium">
                    {nameOf(properties.data, ticket.propertyId)}{ticket.roomId
                      ? ` · Kamar ${nameOf(rooms.data, ticket.roomId, "number")}`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted">Dilaporkan</dt>
                  <dd class="mt-1">{formatDate(ticket.reportedAt)}</dd>
                </div>
              </dl>
              <label class="field-label mt-5" for={`ticket-${ticket._id}`}>
                Ubah status pekerjaan
              </label>
              <select
                id={`ticket-${ticket._id}`}
                class="input-base"
                value={ticket.status}
                disabled={busy === ticket._id}
                onchange={(e) => change(ticket._id, e.currentTarget.value)}
              >
                <option value="open">Terbuka</option>
                <option value="in_progress">Dikerjakan</option>
                <option value="resolved">Tuntas</option>
                <option value="closed">Ditutup</option>
              </select>
            </article>{/each}
        </div>{/if}
    </Tabs.Content>
  {/each}
</Tabs.Root>
<AppDialog
  bind:open
  title="Buat tiket pemeliharaan"
  description="Berikan konteks yang cukup agar pekerjaan mudah ditindaklanjuti."
>
  <form class="space-y-4" onsubmit={submit}>
    <SelectField
      label="Properti"
      name="propertyId"
      options={propertyOptions}
      bind:value={propertyId}
      onValueChange={() => (roomId = "")}
      required
    />
    <div class="grid gap-4 sm:grid-cols-2">
      <SelectField
        label="Kamar"
        name="roomId"
        options={roomOptions}
        bind:value={roomId}
        disabled={!propertyId || rooms.isLoading}
      /><SelectField
        label="Penghuni terkait"
        name="tenantId"
        options={tenantOptions}
        bind:value={tenantId}
      />
    </div>
    <FormField label="Judul pekerjaan" name="title" required>
      {#snippet children({ id, describedby })}<Input
          {id}
          name="title"
          placeholder="Periksa keran kamar mandi"
          aria-describedby={describedby}
        />{/snippet}
    </FormField><FormField label="Uraian" name="description" required>
      {#snippet children({ id, describedby })}<textarea
          {id}
          name="description"
          required
          class="input-base min-h-28 resize-y"
          placeholder="Jelaskan kondisi dan tindakan yang dibutuhkan"
          aria-describedby={describedby}></textarea>{/snippet}
    </FormField><SelectField
      label="Prioritas"
      name="priority"
      bind:value={priority}
      options={[
        { value: "low", label: "Rendah" },
        { value: "medium", label: "Sedang" },
        { value: "high", label: "Tinggi" },
        { value: "urgent", label: "Mendesak" },
      ]}
      required
    />
    <p class="min-h-5 text-sm text-danger" role="status">{open ? error : ""}</p>
    <div class="flex justify-end gap-2">
      <Button variant="secondary" onclick={() => (open = false)}>
        Batal
      </Button><Button type="submit" disabled={submitting}>
        {submitting ? "Menyimpan..." : "Simpan tiket"}
      </Button>
    </div>
  </form>
</AppDialog>
