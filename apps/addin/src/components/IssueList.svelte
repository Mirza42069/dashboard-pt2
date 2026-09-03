<script lang="ts">
	import { Button } from "@DashboardPT2/ui/components/button";
	import {
		Check,
		CircleAlert,
		Icon,
		TriangleAlert,
	} from "@DashboardPT2/ui/components/icons";

	import { t } from "../lib/i18n";

	type Issue = {
		ref: string;
		row: number;
		header: string;
		code: string;
		severity: "ERROR" | "WARNING";
		expected: string | null;
	};

	let {
		issues,
		applied,
		onApply,
	}: {
		issues: Issue[];
		applied: Set<string>;
		onApply: (issue: Issue) => void;
	} = $props();
</script>

<!--
	Findings, one row each. The cell reference used to be a coloured badge at the
	head of the row, which made a list of eight issues read as eight buttons —
	severity is a state, not an action, so it is an icon now and the reference
	drops to the caption line where the column name already lives.
-->
{#if issues.length === 0}
	<p class="text-xs text-muted-foreground">{t("issues.none")}</p>
{:else}
	<div class="divide-y overflow-hidden rounded-md border">
		{#each issues as issue (issue.ref + ":" + issue.row + ":" + issue.code)}
			<div class="flex items-start gap-2 px-2 py-1.5">
				{#if issue.severity === "ERROR"}
					<Icon icon={CircleAlert} class="mt-0.5 size-3 shrink-0 text-destructive" />
					<span class="sr-only">{t("issues.severity.error")}</span>
				{:else}
					<Icon icon={TriangleAlert} class="mt-0.5 size-3 shrink-0 text-warning" />
					<span class="sr-only">{t("issues.severity.warning")}</span>
				{/if}

				<div class="min-w-0 flex-1 leading-tight">
					<p class="text-xs">{t(`issue.${issue.code}`)}</p>
					<!--
						Cell, column, and — when there is nothing to apply — why the row
						has no button. All three are the same kind of aside, and keeping
						them on one caption line stops "No automatic fix" from taking a
						third of a 300px pane away from the finding itself.
					-->
					<p class="truncate text-caption text-muted-foreground">
						<span class="font-mono">{issue.ref}</span>{#if issue.header}{" · " + issue.header}{/if}{#if issue.expected === null}{" · " + t("issues.fixUnavailable")}{/if}
					</p>
				</div>

				{#if applied.has(issue.ref)}
					<span class="flex shrink-0 items-center gap-1 text-caption font-medium text-success">
						<Icon icon={Check} class="size-3" />
						{t("issues.applied")}
					</span>
				{:else if issue.expected !== null}
					<Button variant="ghost" size="xs" class="shrink-0" onclick={() => onApply(issue)}>
						{t("issues.apply")}
					</Button>
				{/if}
			</div>
		{/each}
	</div>
{/if}
