<script lang="ts">
  import { goto } from "$app/navigation";
  import { tick } from "svelte";
  import { authClient } from "$lib/auth-client";
  import { getErrorMessage } from "$lib/format";
  import Button from "$lib/components/Button.svelte";
  import FormField from "$lib/components/FormField.svelte";
  import Input from "$lib/components/Input.svelte";
  import {
    BuildingsIcon,
    EyeIcon,
    EyeSlashIcon,
    GoogleLogoIcon,
    ShieldCheckIcon,
  } from "phosphor-svelte";

  let mode = $state<"signin" | "signup">("signin");
  let name = $state("");
  let email = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let submitting = $state(false);
  let message = $state("");
  let error = $state("");
  let fieldErrors = $state<Record<string, string>>({});

  function validate() {
    const next: Record<string, string> = {};
    if (mode === "signup" && name.trim().length < 2)
      next.name = "Masukkan nama lengkap, sedikitnya 2 karakter.";
    if (!/^\S+@\S+\.\S+$/.test(email))
      next.email = "Masukkan alamat email yang valid.";
    if (password.length < 8)
      next.password = "Gunakan kata sandi sedikitnya 8 karakter.";
    fieldErrors = next;
    return Object.keys(next).length === 0;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = "";
    message = "";
    if (!validate()) {
      const form = event.currentTarget as HTMLFormElement;
      await tick();
      form.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    submitting = true;
    try {
      const result =
        mode === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              name: name.trim(),
              email,
              password,
            });
      if (result.error)
        throw new Error(result.error.message || "Autentikasi gagal.");
      message =
        mode === "signin"
          ? "Berhasil masuk. Menyiapkan ruang kerja..."
          : "Akun berhasil dibuat. Menyiapkan ruang kerja...";
      await goto("/dashboard");
    } catch (cause) {
      const raw = getErrorMessage(cause);
      error = /credential|password|email/i.test(raw)
        ? "Email atau kata sandi tidak cocok. Periksa kembali lalu coba lagi."
        : raw;
    } finally {
      submitting = false;
    }
  }

  async function googleLogin() {
    error = "";
    submitting = true;
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
      if (result.error)
        throw new Error(
          "Masuk dengan Google belum dapat dimulai. Coba lagi atau gunakan email.",
        );
    } catch (cause) {
      error = getErrorMessage(
        cause,
        "Masuk dengan Google belum dapat dimulai. Pastikan integrasi Google sudah dikonfigurasi.",
      );
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Masuk | Paviliun</title>
  <meta name="description" content="Masuk ke ruang operasional kos Paviliun." />
</svelte:head>
<main
  class="grid min-h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,.95fr)]"
>
  <section
    class="relative hidden overflow-hidden bg-forest p-12 text-white lg:flex lg:flex-col lg:justify-between"
  >
    <div class="login-arches" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="relative flex items-center gap-3">
      <span class="grid size-11 place-items-center rounded-md bg-white/12">
        <BuildingsIcon size={24} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <p class="font-display text-2xl font-semibold">Paviliun</p>
        <p class="text-xs text-white/70">Operasional kos, tertata.</p>
      </div>
    </div>
    <blockquote class="relative max-w-xl">
      <p class="mb-5 text-xs uppercase tracking-[0.18em] text-white/75">
        Untuk setiap ruang yang Anda rawat
      </p>
      <p
        class="font-display balance text-[clamp(2.75rem,4.5vw,4.5rem)] leading-[1.06] tracking-tight"
      >
        Kos tertata.
        <br />
        Hari terasa lebih ringan.
      </p>
      <footer class="mt-6 text-sm text-white/68">
        Satu ruang untuk mencatat hunian, menagih sewa,
        <br />
        dan merawat tempat yang disebut rumah.
      </footer>
    </blockquote>
    <p class="relative flex items-center gap-2 text-xs text-white/65">
      <ShieldCheckIcon size={17} aria-hidden="true" />Akses khusus pengelola.
      Penghuni membayar melalui tautan publik.
    </p>
  </section>
  <section
    class="flex min-h-dvh items-center justify-center px-5 py-10 sm:px-10"
  >
    <div class="w-full max-w-md">
      <div class="mb-9 flex items-center gap-3 lg:hidden">
        <span
          class="grid size-10 place-items-center rounded-md bg-forest text-white"
        >
          <BuildingsIcon size={21} aria-hidden="true" />
        </span>
        <div>
          <p class="font-display text-xl font-semibold">Paviliun</p>
          <p class="text-xs text-muted">Operasional kos, tertata.</p>
        </div>
      </div>
      <p class="text-xs font-bold uppercase tracking-[0.14em] text-clay">
        Ruang pengelola
      </p>
      <h1 class="font-display balance mt-3 text-4xl font-medium">
        {mode === "signin" ? "Selamat datang kembali." : "Buat ruang kerja kos"}
      </h1>
      <p class="pretty mt-2 text-sm leading-6 text-muted">
        {mode === "signin"
          ? "Lanjutkan pencatatan properti dan pembayaran Anda."
          : "Akun pertama otomatis menjadi pemilik organisasi."}
      </p>
      <div
        class="mt-7 grid grid-cols-2 rounded-lg bg-forest-soft p-1"
        aria-label="Pilih cara akses"
      >
        <button
          disabled={submitting}
          aria-pressed={mode === "signin"}
          class={`min-h-11 rounded-md text-sm font-semibold ${mode === "signin" ? "bg-paper-strong text-forest shadow-sm" : "text-muted"}`}
          onclick={() => {
            mode = "signin";
            error = "";
            fieldErrors = {};
          }}
        >
          Masuk
        </button>
        <button
          disabled={submitting}
          aria-pressed={mode === "signup"}
          class={`min-h-11 rounded-md text-sm font-semibold ${mode === "signup" ? "bg-paper-strong text-forest shadow-sm" : "text-muted"}`}
          onclick={() => {
            mode = "signup";
            error = "";
            fieldErrors = {};
          }}
        >
          Buat akun
        </button>
      </div>
      <form class="mt-6 space-y-4" onsubmit={submit} novalidate>
        {#if mode === "signup"}<FormField
            label="Nama lengkap"
            name="name"
            required
            error={fieldErrors.name}
          >
            {#snippet children({ id, describedby })}<Input
                {id}
                name="name"
                autocomplete="name"
                bind:value={name}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={describedby}
                placeholder="Ratna Wijaya"
              />{/snippet}
          </FormField>{/if}
        <FormField
          label="Email"
          name="email"
          required
          error={fieldErrors.email}
        >
          {#snippet children({ id, describedby })}<Input
              {id}
              name="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              bind:value={email}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={describedby}
              placeholder="nama@contoh.id"
            />{/snippet}
        </FormField>
        <FormField
          label="Kata sandi"
          name="password"
          required
          hint={mode === "signup" ? "Gunakan sedikitnya 8 karakter." : ""}
          error={fieldErrors.password}
        >
          {#snippet children({ id, describedby })}<div class="relative">
              <Input
                {id}
                name="password"
                type={showPassword ? "text" : "password"}
                autocomplete={mode === "signin"
                  ? "current-password"
                  : "new-password"}
                bind:value={password}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={describedby}
                class="pe-12"
              />
              <button
                type="button"
                class="absolute end-0 top-0 flex size-11 items-center justify-center text-muted hover:text-ink"
                aria-label={showPassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"}
                onclick={() => (showPassword = !showPassword)}
              >
                {#if showPassword}<EyeSlashIcon
                    size={19}
                    aria-hidden="true"
                  />{:else}<EyeIcon size={19} aria-hidden="true" />{/if}
              </button>
            </div>{/snippet}
        </FormField>
        <div class="min-h-6" role="status" aria-live="polite">
          {#if error}<p class="text-sm text-danger">
              {error}
            </p>{:else if message}<p class="text-sm text-forest">
              {message}
            </p>{/if}
        </div>
        <Button type="submit" disabled={submitting} class="w-full">
          {submitting
            ? "Memproses..."
            : mode === "signin"
              ? "Masuk ke Paviliun"
              : "Buat akun pemilik"}
        </Button>
      </form>
      <div class="my-5 flex items-center gap-3 text-xs text-muted">
        <span class="h-px flex-1 bg-line"></span>
        atau
        <span class="h-px flex-1 bg-line"></span>
      </div>
      <Button
        variant="secondary"
        class="w-full"
        onclick={googleLogin}
        disabled={submitting}
      >
        <GoogleLogoIcon size={19} weight="bold" aria-hidden="true" />Lanjutkan
        dengan Google
      </Button>
      <p class="pretty mt-7 text-center text-xs leading-5 text-muted">
        Dengan melanjutkan, Anda memastikan bahwa akses ini hanya digunakan
        untuk mengelola operasional kos.
      </p>
    </div>
  </section>
</main>

<style>
  .login-arches {
    position: absolute;
    inset: auto -5rem -7rem auto;
    display: flex;
    align-items: end;
    gap: 1.5rem;
    opacity: 0.16;
    pointer-events: none;
  }
  .login-arches span {
    display: block;
    width: 11rem;
    height: 38rem;
    border: 1px solid white;
    border-radius: 8rem 8rem 0 0;
  }
  .login-arches span:nth-child(2) {
    height: 46rem;
  }
</style>
