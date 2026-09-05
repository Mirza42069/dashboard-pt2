<script lang="ts">
  import { goto } from "$app/navigation";
  import { useAuth } from "@mmailaender/convex-better-auth-svelte/svelte";
  const auth = useAuth();
  $effect(() => {
    if (!auth.isLoading)
      void goto(auth.isAuthenticated ? "/dashboard" : "/masuk", {
        replaceState: true,
      });
  });
</script>

<svelte:head><title>Paviliun</title></svelte:head>
<main class="grid min-h-dvh place-items-center px-4">
  <p class="text-sm text-muted" role="status">Menyiapkan Paviliun...</p>
</main>
