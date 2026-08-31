<script lang="ts" module>
	import { Badge, type BadgeVariant } from "@DashboardPT2/ui/components/badge";
	import {
		CircleCheck,
		CircleDot,
		Eye,
		Lock,
		OctagonX,
		Pencil,
		RotateCcw,
		Send,
		TriangleAlert,
		type IconComponent
	} from "@DashboardPT2/ui/components/icons";

	/**
	 * Status is never communicated by colour alone: every badge carries an icon
	 * and a written label (localized). That is what makes these readable to
	 * colourblind users, in print, and under forced-colours mode.
	 *
	 * These deliberately do NOT use --chart-1..5. That ramp encodes magnitude, so
	 * painting statuses with it would imply an ordering that does not exist.
	 *
	 * BadgeVariant is imported rather than redeclared. A local copy of the union
	 * used to live here and had already fallen a member behind the real one, so a
	 * variant this file rejected was one the Badge accepted.
	 */
	type Descriptor = { variant: BadgeVariant; icon: IconComponent };

	const STYLES: Record<string, Record<string, Descriptor>> = {
		/**
		 * Where a reconciliation stands in the close workflow. Seven states, each
		 * with its own glyph — the distinctions this workflow turns on (never
		 * opened vs being worked, reopened vs merely unfinished) are exactly the
		 * ones a shared icon would erase.
		 *
		 * `reopened` is the only destructive variant. It is the one state that is
		 * somebody else waiting on you, and it should read that way at a glance.
		 * The two queue states carry `default` because they are what the reviewer
		 * is looking for; the two settled ones recede.
		 */
		reconciliation: {
			draft: { variant: "outline", icon: Pencil },
			in_progress: { variant: "secondary", icon: CircleDot },
			ready_for_review: { variant: "default", icon: Eye },
			submitted: { variant: "default", icon: Send },
			approved: { variant: "secondary", icon: CircleCheck },
			completed: { variant: "ghost", icon: Lock },
			reopened: { variant: "destructive", icon: RotateCcw }
		},
		/**
		 * How much an unmatched difference matters. Three steps, and unlike the
		 * workflow above this one *is* ordered — but it is ordered by risk, not
		 * magnitude, so it still stays off the chart ramp.
		 */
		exceptionSeverity: {
			info: { variant: "secondary", icon: CircleDot },
			warning: { variant: "outline", icon: TriangleAlert },
			error: { variant: "destructive", icon: OctagonX }
		}
	};
</script>

<script lang="ts">
	import { getT } from "../../i18n/context.svelte";
	import { statusLabel, type StatusKind } from "../status-badge";

	let { kind, value }: { kind: StatusKind; value: string | null | undefined } = $props();

	const t = getT();
	const descriptor = $derived(value ? STYLES[kind]?.[value.toLowerCase()] : undefined);
</script>

{#if !value || !descriptor}
	<Badge variant="outline">{value ?? "—"}</Badge>
{:else}
	{@const Icon = descriptor.icon}
	<Badge variant={descriptor.variant}>
		<Icon />
		{statusLabel(t, kind, value)}
	</Badge>
{/if}
