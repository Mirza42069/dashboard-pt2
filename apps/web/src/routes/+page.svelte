<!--
	The landing page and the sign-in page, which are now one page.

	They used to be two: `/` sold the product and `/login` took the password, with
	a button between them. Splitting them cost a navigation on the only journey
	anyone actually makes here — every account is issued by an administrator, so
	there is no sign-up funnel to protect and nobody arrives needing to be
	convinced before they can type. The form is the primary action, so it gets the
	primary column; the explanation is what someone reads while deciding whether
	they are in the right place, so it sits beside the form rather than in front
	of it.

	`/login` still resolves — it redirects here, carrying ?next= — because
	bookmarks and the sign-out flow both point at it.
-->
<script lang="ts">
	import { getT } from '../i18n/context.svelte';
	import { BRAND_NAME, CONTACT_EMAIL } from '$lib/components/brand';
	import BrandMark from '$lib/components/brand-mark.svelte';
	import LandingMock from '$lib/components/landing-mock.svelte';
	import SignInForm from '$lib/components/sign-in-form.svelte';

	const t = getT();

	const steps = $derived([
		{ n: '01', title: t.landing.step1Title, body: t.landing.step1Body },
		{ n: '02', title: t.landing.step2Title, body: t.landing.step2Body },
		{ n: '03', title: t.landing.step3Title, body: t.landing.step3Body }
	]);
</script>

<svelte:head><title>{BRAND_NAME} — {t.auth.tagline}</title></svelte:head>

<!--
	One document scroll below lg (form first, explanation under it); two
	independently scrolling columns at lg and up, so a long explanation never
	drags the form off the screen.
-->
<div class="lg:grid lg:h-svh lg:grid-cols-[minmax(0,29rem)_1fr] lg:overflow-hidden">
	<div
		class="flex min-h-svh flex-col px-6 py-10 sm:px-10 lg:h-svh lg:min-h-0 lg:overflow-y-auto"
	>
		<div class="flex flex-1 items-center py-8">
			<div class="mx-auto w-full max-w-sm space-y-8">
				<!-- The mark carries the brand without a separate Latin wordmark. -->
				<div class="space-y-1">
					<BrandMark size="lg" class="mb-4" />
					<p class="text-lg font-semibold tracking-tight">{BRAND_NAME}</p>
					<p class="text-sm text-muted-foreground">{t.auth.tagline}</p>
				</div>

				<SignInForm />

				<p class="text-xs leading-5 text-muted-foreground text-pretty">
					{t.auth.contactAdminFootnote}
				</p>
			</div>
		</div>

		<footer
			class="flex flex-col gap-1 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
		>
			<p>{t.landing.footnote}</p>
			<a href="mailto:{CONTACT_EMAIL}" class="hover:text-foreground">{CONTACT_EMAIL}</a>
		</footer>
	</div>

	<aside
		class="relative isolate overflow-hidden border-t bg-secondary px-6 py-16 sm:px-10 lg:h-svh lg:overflow-y-auto lg:border-t-0 lg:border-l lg:py-20 xl:px-16"
	>
		<!--
			Atmosphere, drawn from tokens so it cannot drift out of the palette: a
			ledger rule behind everything, faded out towards the bottom so it never
			competes with the type, and a wash of --accent behind the product shot.
			Both are decoration and neither carries meaning, hence aria-hidden.
		-->
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
			style="background-image:
				repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px 5rem),
				repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px 2rem);"
		></div>
		<div
			aria-hidden="true"
			class="pointer-events-none absolute inset-0 -z-10"
			style="background: radial-gradient(48rem 32rem at 88% -6%, var(--accent), transparent 68%);"
		></div>

		<div class="mx-auto max-w-xl lg:mx-0 lg:max-w-2xl">
			<p class="text-caption font-semibold tracking-[0.18em] text-brand uppercase">
				{t.landing.eyebrow}
			</p>
			<h1
				class="mt-4 text-3xl font-semibold tracking-tight text-balance md:text-4xl md:leading-[1.1]"
			>
				{t.landing.title}
			</h1>
			<p class="mt-5 max-w-xl text-base text-muted-foreground text-pretty">
				{t.landing.subtitle}
			</p>

			<LandingMock class="mt-10 hidden md:block" />

			<ol class="mt-12 space-y-7">
				{#each steps as step (step.n)}
					<li class="flex gap-4">
						<span class="mt-0.5 font-mono text-caption text-brand tabular-nums">{step.n}</span>
						<div class="min-w-0">
							<h2 class="text-sm font-semibold tracking-tight">{step.title}</h2>
							<p class="mt-1.5 text-sm text-muted-foreground text-pretty">{step.body}</p>
						</div>
					</li>
				{/each}
			</ol>

			<div class="mt-12 border-l-2 border-brand pl-4">
				<h2 class="text-sm font-semibold tracking-tight">{t.landing.proofTitle}</h2>
				<p class="mt-1.5 text-sm text-muted-foreground text-pretty">{t.landing.proofBody}</p>
			</div>
		</div>
	</aside>
</div>
