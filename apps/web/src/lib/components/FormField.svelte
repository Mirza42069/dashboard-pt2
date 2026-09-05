<script lang="ts">
  import { setContext, type Snippet } from "svelte";
  let {
    label,
    name,
    hint = "",
    error = "",
    required = false,
    children,
  }: {
    label: string;
    name: string;
    hint?: string;
    error?: string;
    required?: boolean;
    children: Snippet<[{ id: string; describedby?: string }]>;
  } = $props();
  setContext("paviliun-field", {
    get required() {
      return required;
    },
  });
  const uid = $props.id();
  const id = $derived(`${uid}-${name}`);
  const localizedHint = $derived(
    hint
      .replace("Business ID", "ID bisnis")
      .replace("secret key", "kunci rahasia"),
  );
  const describedby = $derived(
    [localizedHint ? `${id}-hint` : "", error ? `${id}-error` : ""]
      .filter(Boolean)
      .join(" ") || undefined,
  );
</script>

<div>
  <label class="field-label" for={id}>
    {label}{#if required}<span class="text-clay" aria-hidden="true">
        *
      </span>{/if}
  </label>
  {@render children({ id, describedby })}
  {#if localizedHint}<p class="field-hint" id={`${id}-hint`}>
      {localizedHint}
    </p>{/if}
  {#if error}<p class="field-error" id={`${id}-error`}>{error}</p>{/if}
</div>
