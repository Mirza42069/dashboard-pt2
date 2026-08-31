<script lang="ts" module>
	import { Badge } from "@DashboardPT2/ui/components/badge";
	import {
		CircleAlert,
		CircleCheck,
		CircleDashed,
		CircleDot,
		CircleSlash,
		Hammer,
		Lock,
		OctagonX,
		PauseCircle,
		Pencil,
		Send,
		type IconComponent
	} from "@DashboardPT2/ui/components/icons";

	/**
	 * Status is never communicated by colour alone: every badge carries an icon
	 * and a written label (localized). That is what makes these readable to
	 * colourblind users, in print, and under forced-colours mode.
	 *
	 * These deliberately do NOT use --chart-1..5. That ramp encodes magnitude, so
	 * painting statuses with it would imply an ordering that does not exist.
	 */
	type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost";
	type Descriptor = { variant: BadgeVariant; icon: IconComponent };

	const STYLES: Record<string, Record<string, Descriptor>> = {
		project: {
			planning: { variant: "outline", icon: CircleDashed },
			active: { variant: "default", icon: Hammer },
			on_hold: { variant: "secondary", icon: PauseCircle },
			completed: { variant: "ghost", icon: CircleCheck },
			cancelled: { variant: "destructive", icon: OctagonX }
		},
		ticket: {
			open: { variant: "outline", icon: CircleDot },
			in_progress: { variant: "default", icon: CircleDot },
			resolved: { variant: "secondary", icon: CircleCheck },
			closed: { variant: "ghost", icon: CircleSlash }
		},
		/**
		 * Where a progress report stands. Seven states, each with its own glyph —
		 * the distinctions this workflow turns on (untouched vs being written,
		 * returned vs merely unfinished) are exactly the ones a shared icon would
		 * erase.
		 *
		 * `returned` is the only destructive variant. It is the one state that is
		 * somebody else waiting on you, and it should read that way at a glance.
		 */
		period: {
			open: { variant: "outline", icon: CircleDashed },
			draft: { variant: "outline", icon: Pencil },
			submitted: { variant: "default", icon: Send },
			reviewed: { variant: "default", icon: CircleDot },
			approved: { variant: "secondary", icon: CircleCheck },
			locked: { variant: "ghost", icon: Lock },
			returned: { variant: "destructive", icon: CircleAlert }
		}
	};
</script>

<script lang="ts">
	import { getT } from "../../i18n/context.svelte";
	import { statusLabel, type StatusKind } from "../status-badge";

	let { kind, value }: { kind: StatusKind; value: string | null | undefined } = $props();

	const t = getT();
	const descriptor = $derived(value ? STYLES[kind]?.[value] : undefined);
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
