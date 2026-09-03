<script lang="ts">
	import { Badge } from "@DashboardPT2/ui/components/badge";
	import { Button } from "@DashboardPT2/ui/components/button";

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

<div class="space-y-1.5">
	{#if issues.length === 0}
		<p class="text-xs text-muted-foreground">{t("issues.none")}</p>
	{:else}
		{#each issues as issue (issue.ref + ":" + issue.row + ":" + issue.code)}
			<div class="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5">
				<Badge variant={issue.severity === "ERROR" ? "destructive" : "secondary"} class="font-mono text-[10px]">
					{issue.ref}
				</Badge>
				<div class="min-w-0 flex-1 leading-tight">
					<p class="truncate text-xs">{t(`issue.${issue.code}`)}</p>
					{#if issue.header}
						<p class="truncate text-[10px] text-muted-foreground">{issue.header}</p>
					{/if}
				</div>
				{#if applied.has(issue.ref)}
					<span class="text-[10px] font-medium text-success">{t("issues.applied")}</span>
				{:else if issue.expected !== null}
					<Button variant="outline" size="xs" onclick={() => onApply(issue)}>
						{t("issues.apply")}
					</Button>
				{:else}
					<span class="text-[10px] text-muted-foreground">{t("issues.fixUnavailable")}</span>
				{/if}
			</div>
		{/each}
	{/if}
</div>
