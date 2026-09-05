<script lang="ts">
  import type { Snippet } from "svelte";
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from "svelte/elements";

  type Props = {
    children: Snippet;
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md";
    href?: string;
    class?: string;
    disabled?: boolean;
    type?: HTMLButtonAttributes["type"];
    onclick?: HTMLButtonAttributes["onclick"];
    target?: HTMLAnchorAttributes["target"];
    download?: string;
    title?: string;
  };

  let {
    children,
    variant = "primary",
    size = "md",
    href,
    class: className = "",
    disabled = false,
    type = "button",
    onclick,
    target,
    download,
    title,
  }: Props = $props();
  const variants = {
    primary:
      "bg-forest text-white shadow-[0_1px_2px_oklch(0_0_0/.12)] hover:bg-forest-hover",
    secondary:
      "border border-line bg-paper-strong text-ink hover:border-forest/45 hover:bg-forest-soft/50",
    ghost: "text-muted hover:bg-forest-soft hover:text-forest",
    danger: "bg-danger text-white hover:opacity-90",
  };
  const sizes = { sm: "min-h-10 px-3 text-sm", md: "min-h-11 px-4 text-sm" };
  const classes = $derived(
    `inline-flex items-center justify-center gap-2 rounded-[.45rem] font-semibold motion-safe:transition-[background-color,border-color,color,opacity,scale] duration-150 motion-safe:enabled:active:scale-[.96] disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`,
  );
</script>

{#if href}
  <a class={classes} {href} {target} {download} {title}>{@render children()}</a>
{:else}
  <button class={classes} {type} {disabled} {onclick} {title}>
    {@render children()}
  </button>
{/if}
