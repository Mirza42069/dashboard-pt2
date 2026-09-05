<script lang="ts">
  import "../app.css";
  import "@fontsource-variable/dm-sans";
  import "@fontsource-variable/newsreader";
  import { browser } from "$app/environment";
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "@my-better-t-app/backend/convex/_generated/api";
  import {
    createSvelteAuthClient,
    useAuth,
  } from "@mmailaender/convex-better-auth-svelte/svelte";
  import { useMutation } from "convex-svelte";
  import { authClient } from "$lib/auth-client";
  import { setOrganization } from "$lib/organization.svelte";
  import { getErrorMessage } from "$lib/format";
  import AppShell from "$lib/components/AppShell.svelte";
  import Skeleton from "$lib/components/Skeleton.svelte";

  let { children } = $props();
  createSvelteAuthClient({ authClient, options: { expectAuth: false } });
  const auth = useAuth();
  const session = authClient.useSession();
  const ensureCurrent = useMutation(api.organizations.ensureCurrent);
  const organizationState = $state({
    organization: null as any,
    membership: null as any,
    isLoading: true,
    error: "",
    signingOut: false,
  });
  setOrganization(organizationState);
  const isPublic = $derived(
    page.url.pathname === "/masuk" || page.url.pathname.startsWith("/bayar/"),
  );

  $effect(() => {
    const userId = $session.data?.user.id;
    const authenticated = auth.isAuthenticated;
    const loading = auth.isLoading;
    const signingOut = untrack(() => organizationState.signingOut);
    if (!loading && !authenticated) organizationState.signingOut = false;
    if (signingOut && authenticated) return;
    organizationState.organization = null;
    organizationState.membership = null;
    organizationState.error = "";
    organizationState.isLoading = loading;
    if (!browser || loading || signingOut || !authenticated || !userId) return;
    // Only session changes restart this request. Cleanup rejects stale responses.
    let cancelled = false;
    organizationState.isLoading = true;
    untrack(() => ensureCurrent({}))
      .then((result: any) => {
        if (
          cancelled ||
          organizationState.signingOut ||
          !auth.isAuthenticated ||
          $session.data?.user.id !== userId
        )
          return;
        organizationState.organization = result.organization;
        organizationState.membership = result.membership;
        organizationState.error = "";
        if (page.url.pathname === "/masuk" || page.url.pathname === "/")
          void goto("/dashboard");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        organizationState.error = getErrorMessage(
          error,
          "Ruang kerja belum dapat disiapkan. Muat ulang halaman untuk mencoba lagi.",
        );
      })
      .finally(() => {
        if (!cancelled) organizationState.isLoading = false;
      });
    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (
      browser &&
      !auth.isLoading &&
      !auth.isAuthenticated &&
      !isPublic &&
      page.url.pathname !== "/"
    ) {
      void goto("/masuk");
    }
  });
</script>

<svelte:head><title>Paviliun | Operasional kos, tertata.</title></svelte:head>

{#if isPublic || page.url.pathname === "/"}
  {@render children()}
{:else if auth.isLoading || organizationState.isLoading}
  <div class="mx-auto max-w-xl px-4 py-24"><Skeleton rows={5} /></div>
{:else if organizationState.error}
  <main class="mx-auto max-w-xl px-4 py-24">
    <div class="surface rounded-lg p-7" role="alert">
      <h1 class="font-display text-2xl font-semibold">
        Ruang kerja belum siap
      </h1>
      <p class="mt-2 text-sm leading-6 text-muted">{organizationState.error}</p>
      <button
        class="mt-5 min-h-11 rounded-md bg-forest px-4 text-sm font-semibold text-white"
        onclick={() => location.reload()}
      >
        Muat ulang halaman
      </button>
    </div>
  </main>
{:else if auth.isAuthenticated && organizationState.organization}
  <AppShell>{@render children()}</AppShell>
{/if}
