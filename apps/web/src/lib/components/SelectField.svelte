<script lang="ts">
  import { Select } from "bits-ui";
  import { CaretDownIcon, CheckIcon } from "phosphor-svelte";
  export type Option = { value: string; label: string; disabled?: boolean };
  let {
    value = $bindable(""),
    options,
    label,
    name,
    placeholder = "Pilih opsi",
    required = false,
    hint = "",
    disabled = false,
    onValueChange,
  }: {
    value?: string;
    options: Option[];
    label: string;
    name: string;
    placeholder?: string;
    required?: boolean;
    hint?: string;
    disabled?: boolean;
    onValueChange?: (value: string) => void;
  } = $props();
  const uid = $props.id();
  const selectedLabel = $derived(
    options.find((item) => item.value === value)?.label ?? placeholder,
  );
</script>

<div>
  <span class="field-label" id={`${uid}-label`}>
    {label}{#if required}<span class="text-clay" aria-hidden="true">
        *
      </span>{/if}
  </span>
  <Select.Root
    type="single"
    bind:value
    {name}
    {required}
    {disabled}
    {onValueChange}
    items={options}
  >
    <Select.Trigger
      class="input-base flex items-center justify-between gap-3 text-start"
      aria-labelledby={`${uid}-label`}
      aria-describedby={hint ? `${uid}-hint` : undefined}
      aria-required={required}
    >
      <span class:text-muted={!value}>{selectedLabel}</span>
      <CaretDownIcon size={16} aria-hidden="true" />
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        sideOffset={6}
        class="z-[70] max-h-[min(20rem,var(--bits-select-content-available-height))] w-[var(--bits-select-anchor-width)] overflow-y-auto rounded-lg border border-line bg-paper-strong p-1.5 shadow-xl"
      >
        <Select.Viewport>
          {#each options as option (option.value)}
            <Select.Item
              value={option.value}
              disabled={option.disabled}
              label={option.label}
              class="flex min-h-10 cursor-default items-center justify-between gap-3 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-forest-soft data-[highlighted]:text-forest data-[disabled]:opacity-45"
            >
              {#snippet children({ selected })}
                <span>{option.label}</span>
                {#if selected}<CheckIcon
                    size={16}
                    class="shrink-0 text-forest"
                    aria-hidden="true"
                  />{/if}
              {/snippet}
            </Select.Item>
          {/each}
          {#if options.length === 0}<p class="px-3 py-4 text-sm text-muted">
              Belum ada pilihan tersedia.
            </p>{/if}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
  {#if hint}<p class="field-hint" id={`${uid}-hint`}>{hint}</p>{/if}
</div>
