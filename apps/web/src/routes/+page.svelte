<script lang="ts">
	import { Button } from '@DashboardPT2/ui/components/button';
	import { Check, Send, Sparkles } from '@DashboardPT2/ui/components/icons';

	import { getT } from '../i18n/context.svelte';
	import { BRAND_NAME, CONTACT_EMAIL } from '$lib/components/brand';
	import BrandMark from '$lib/components/brand-mark.svelte';

	const t = getT();

	const steps = $derived([
		{ n: '01', title: t.landing.step1Title, body: t.landing.step1Body },
		{ n: '02', title: t.landing.step2Title, body: t.landing.step2Body },
		{ n: '03', title: t.landing.step3Title, body: t.landing.step3Body }
	]);

	/**
	 * The product shot is drawn, not screenshotted.
	 *
	 * A real capture goes stale the first time the grid is restyled, and this
	 * page is the one place the reader has no product to compare it against. It
	 * is built from the same tokens as the real thing, so it cannot drift in
	 * colour or type even when it drifts in layout.
	 *
	 * It shows the grid rather than the chat, because that is where the work
	 * happens — the agent is the rail beside it, not the product.
	 */
	const demoColumns = ['TaxInvoiceDate', 'BuyerTIN', 'TaxBase'];

	/** The third row carries the flagged cell the agent is explaining. */
	const demoRows = [
		{ n: '3', cells: ['2026-08-01', '0012345678901000', '12.500.000'], flagged: -1 },
		{ n: '4', cells: ['2026-08-03', '0098765432109000', '890.000'], flagged: -1 },
		{ n: '5', cells: ['2026-08-05', '00987654321', '1.240.000'], flagged: 1 }
	];

	const demoSteps = $derived([
		t.agent.stepLabels.pulled_statement.replace('{lines}', '842'),
		t.agent.stepLabels.flagged_breaks.replace('{count}', '1')
	]);
</script>

<svelte:head><title>{BRAND_NAME} — {t.auth.tagline}</title></svelte:head>

<div class="flex min-h-svh flex-col">
	<header class="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
		<div class="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-6">
			<div class="flex items-center gap-2">
				<BrandMark />
				<span class="text-sm font-semibold tracking-tight">{BRAND_NAME}</span>
			</div>
			<Button href="/login" size="sm">{t.auth.signIn}</Button>
		</div>
	</header>

	<main class="flex-1">
		<!--
			The claim, then the proof, immediately. The reference site earns its
			space with photography; this one has none, so the product shot below the
			headline does that job instead — and it is the honest version, since it
			is the thing being sold.
		-->
		<section class="mx-auto w-full max-w-4xl px-6 pt-20 pb-12 text-center md:pt-28">
			<p class="text-caption font-semibold tracking-[0.18em] text-brand uppercase">
				{t.landing.eyebrow}
			</p>
			<h1
				class="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl md:leading-[1.05]"
			>
				{t.landing.title}
			</h1>
			<p class="mx-auto mt-6 max-w-2xl text-base text-muted-foreground text-pretty md:text-lg">
				{t.landing.subtitle}
			</p>
			<div class="mt-8 flex flex-col items-center gap-3">
				<Button href="/login" size="lg">{t.auth.signIn}</Button>
				<p class="text-caption text-muted-foreground">{t.landing.ctaHint}</p>
			</div>
		</section>

		<section class="mx-auto w-full max-w-4xl px-6 pb-24" aria-hidden="true">
			<div class="overflow-hidden rounded-xl border bg-card shadow-xl">
				<div class="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
					<span class="size-2 rounded-full bg-border"></span>
					<span class="size-2 rounded-full bg-border"></span>
					<span class="size-2 rounded-full bg-border"></span>
				</div>

				<div class="flex">
					<!-- The nav rail, reduced to its silhouette. -->
					<div class="hidden w-10 shrink-0 flex-col gap-1.5 bg-surface-shell p-2 sm:flex">
						<span class="h-4 rounded bg-brand/70"></span>
						<span class="h-2.5 rounded bg-foreground/10"></span>
						<span class="h-2.5 rounded bg-foreground/10"></span>
						<span class="h-2.5 rounded bg-foreground/10"></span>
					</div>

					<!-- The grid. -->
					<div class="min-w-0 flex-1 border-x">
						<div class="flex h-7 items-center border-b bg-background">
							<span class="grid h-full w-12 place-items-center border-r font-mono text-caption font-semibold">
								B5
							</span>
							<span class="grid h-full w-7 place-items-center border-r font-serif text-xs italic text-muted-foreground">
								fx
							</span>
							<span class="truncate px-2 font-mono text-xs">00987654321</span>
						</div>

						<table class="w-full border-collapse">
							<thead>
								<tr class="bg-surface-grid-header">
									<th class="w-10 border-r border-b px-1 py-1 text-center font-mono text-caption font-semibold">
										#
									</th>
									{#each demoColumns as column, index (column)}
										<th class="border-r border-b px-2 py-1 text-left">
											<span class="block text-center font-mono text-caption text-muted-foreground">
												{String.fromCharCode(65 + index)}
											</span>
											<span class="block truncate text-caption font-medium">{column}</span>
										</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each demoRows as row (row.n)}
									<tr>
										<td class="h-row border-r border-b bg-surface-grid-header text-center font-mono text-caption text-muted-foreground tabular-nums">
											{row.n}
										</td>
										{#each row.cells as cell, index (cell)}
											<td
												class="relative h-row border-r border-b px-2 font-mono text-xs tabular-nums {row.flagged ===
												index
													? 'bg-destructive/5 ring-2 ring-brand ring-inset'
													: ''}"
											>
												<span class="block truncate">{cell}</span>
												{#if row.flagged === index}
													<span
														class="absolute top-0 right-0 size-0 border-t-4 border-r-4 border-t-destructive border-r-destructive"
													></span>
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- The agent rail, where it actually sits. -->
					<div class="hidden w-56 shrink-0 flex-col bg-surface-panel md:flex">
						<div class="flex h-7 items-center gap-1.5 border-b px-2">
							<span class="grid size-4 place-items-center rounded bg-ink-strong text-background">
								<Sparkles class="size-2.5" />
							</span>
							<span class="text-caption font-semibold">{t.agentPanel.tabIssues}</span>
							<span class="ml-auto text-caption text-destructive tabular-nums">1</span>
						</div>
						<div class="space-y-2 p-2">
							<ol class="space-y-1 rounded-md border bg-background px-2 py-1.5">
								{#each demoSteps as step (step)}
									<li class="flex items-center gap-1.5 text-caption text-muted-foreground">
										<span class="grid size-3 shrink-0 place-items-center rounded-full bg-success/15 text-success">
											<Check class="size-2" />
										</span>
										<span class="truncate">{step}</span>
									</li>
								{/each}
							</ol>
							<div class="border-l-2 border-brand bg-brand/5 px-2 py-1.5">
								<p class="text-caption font-semibold tracking-wide text-brand uppercase">
									{t.workbook.suggestedFix}
								</p>
								<p class="mt-1 text-caption leading-4">INVALID_NITKU · 22 digits</p>
							</div>
						</div>
						<div class="mt-auto border-t p-2">
							<div class="flex items-center gap-1.5">
								<span class="h-6 flex-1 rounded-md border bg-background"></span>
								<span class="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-brand-foreground">
									<Send class="size-3" />
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<section id="how-it-works" class="border-t bg-card/40 py-20">
			<div class="mx-auto w-full max-w-6xl px-6">
				<h2 class="text-caption font-semibold tracking-[0.18em] text-muted-foreground uppercase">
					{t.landing.howItWorks}
				</h2>
				<ol class="mt-8 grid gap-10 md:grid-cols-3 md:gap-8">
					{#each steps as step (step.n)}
						<li class="border-t pt-5">
							<span class="font-mono text-caption text-brand tabular-nums">{step.n}</span>
							<h3 class="mt-2 text-lg font-semibold tracking-tight">{step.title}</h3>
							<p class="mt-2 text-sm text-muted-foreground text-pretty">{step.body}</p>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<section class="mx-auto w-full max-w-3xl px-6 py-24 text-center">
			<h2 class="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
				{t.landing.proofTitle}
			</h2>
			<p class="mx-auto mt-4 max-w-xl text-sm text-muted-foreground text-pretty md:text-base">
				{t.landing.proofBody}
			</p>
		</section>
	</main>

	<footer
		class="flex flex-col items-center justify-between gap-2 border-t px-6 py-6 text-xs text-muted-foreground sm:flex-row"
	>
		<p>{t.landing.footnote}</p>
		<a href="mailto:{CONTACT_EMAIL}" class="hover:text-foreground">{CONTACT_EMAIL}</a>
	</footer>
</div>
