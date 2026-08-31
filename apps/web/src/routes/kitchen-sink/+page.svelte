<script lang="ts">
	// Phase 0 gate: renders the ported tokens and every primitive in one place so
	// the shared stylesheet and component set can be checked against the React
	// template. Temporary — delete once the real screens exist.
	import { Alert, AlertDescription, AlertTitle } from '@DashboardPT2/ui/components/alert';
	import * as AlertDialog from '@DashboardPT2/ui/components/alert-dialog';
	import * as Avatar from '@DashboardPT2/ui/components/avatar';
	import { Badge } from '@DashboardPT2/ui/components/badge';
	import { Button } from '@DashboardPT2/ui/components/button';
	import * as Card from '@DashboardPT2/ui/components/card';
	import { Checkbox } from '@DashboardPT2/ui/components/checkbox';
	import * as Dialog from '@DashboardPT2/ui/components/dialog';
	import * as DropdownMenu from '@DashboardPT2/ui/components/dropdown-menu';
	import { Input } from '@DashboardPT2/ui/components/input';
	import { Label } from '@DashboardPT2/ui/components/label';
	import * as Popover from '@DashboardPT2/ui/components/popover';
	import { Progress } from '@DashboardPT2/ui/components/progress';
	import * as Select from '@DashboardPT2/ui/components/select';
	import { Separator } from '@DashboardPT2/ui/components/separator';
	import { Skeleton } from '@DashboardPT2/ui/components/skeleton';
	import * as Table from '@DashboardPT2/ui/components/table';
	import * as Tabs from '@DashboardPT2/ui/components/tabs';
	import { Textarea } from '@DashboardPT2/ui/components/textarea';
	import * as Tooltip from '@DashboardPT2/ui/components/tooltip';
	import { toast } from 'svelte-sonner';

	const VARIANTS = ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const;
	const SIZES = ['xs', 'sm', 'default', 'lg'] as const;

	// Written out rather than composed, because Tailwind scans source text and
	// never sees a class name that only exists once a template literal has run.
	const SURFACES = [
		['background', 'bg-background'],
		['card', 'bg-card'],
		['primary', 'bg-primary'],
		['secondary', 'bg-secondary'],
		['muted', 'bg-muted'],
		['accent', 'bg-accent'],
		['destructive', 'bg-destructive'],
		['success', 'bg-success'],
		['warning', 'bg-warning'],
		['brand', 'bg-brand']
	];
	const CHART = ['bg-chart-1', 'bg-chart-2', 'bg-chart-3', 'bg-chart-4', 'bg-chart-5'];
	// The progress ramp is deliberately not registered as a Tailwind color — it
	// is read as a raw custom property so progress-tone.ts can color-mix between
	// adjacent stops. Rendered the same way here.
	const PROGRESS = [
		'--progress-1',
		'--progress-2',
		'--progress-3',
		'--progress-4',
		'--progress-5'
	];
	const SHADOWS = [
		['2xs', 'shadow-2xs'],
		['xs', 'shadow-xs'],
		['sm', 'shadow-sm'],
		['md', 'shadow-md'],
		['lg', 'shadow-lg'],
		['xl', 'shadow-xl'],
		['2xl', 'shadow-2xl']
	];
	const ROWS: [string, number, number, string][] = [
		['Earthworks', 42.5, 39.1, 'behind'],
		['Structure', 18.0, 18.4, 'ahead'],
		['Finishing', 4.2, 0, 'not started']
	];

	let checked = $state(true);
	let status = $state('active');
</script>

<div class="mx-auto max-w-5xl space-y-8 px-6 py-10">
	<header>
		<h1 class="text-lg font-medium tracking-tight">Design system</h1>
		<p class="mt-1 text-xs text-muted-foreground">
			Ported tokens and primitives — the reference for every screen.
		</p>
	</header>

	<section class="space-y-3">
		<h2 class="text-xs font-medium tracking-widest text-muted-foreground uppercase">Tokens</h2>
		<div class="flex flex-wrap gap-2">
			{#each SURFACES as [name, klass] (name)}
				<div class="w-24">
					<div class="h-10 rounded-md ring-1 ring-foreground/10 {klass}"></div>
					<p class="mt-1 text-[0.6875rem] text-muted-foreground">{name}</p>
				</div>
			{/each}
		</div>
		<div class="flex gap-1">
			{#each CHART as klass (klass)}
				<div class="h-8 flex-1 rounded-md {klass}"></div>
			{/each}
		</div>
		<div class="flex gap-1">
			{#each PROGRESS as token (token)}
				<div class="h-8 flex-1 rounded-md" style="background: var({token})"></div>
			{/each}
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-xs font-medium tracking-widest text-muted-foreground uppercase">Elevation</h2>
		<div class="flex flex-wrap gap-4">
			{#each SHADOWS as [name, klass] (name)}
				<div
					class="grid size-16 place-items-center rounded-md bg-card text-[0.6875rem] text-muted-foreground {klass}"
				>
					{name}
				</div>
			{/each}
		</div>
	</section>

	<section class="space-y-3">
		<h2 class="text-xs font-medium tracking-widest text-muted-foreground uppercase">Button</h2>
		<div class="flex flex-wrap items-center gap-2">
			{#each VARIANTS as variant (variant)}
				<Button {variant}>{variant}</Button>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			{#each SIZES as size (size)}
				<Button {size}>size {size}</Button>
			{/each}
			<Button disabled>disabled</Button>
		</div>
		<div class="flex flex-wrap gap-2">
			{#each VARIANTS.slice(0, 5) as variant (variant)}
				<Badge {variant}>{variant}</Badge>
			{/each}
		</div>
	</section>

	<section class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>Card title</Card.Title>
				<Card.Description>Cards carry every section on every screen.</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="space-y-1.5">
					<Label for="ks-name">Project name</Label>
					<Input id="ks-name" placeholder="Jalan Tol Cisumdawu" />
				</div>
				<div class="space-y-1.5">
					<Label for="ks-notes">Notes</Label>
					<Textarea id="ks-notes" placeholder="Period commentary" />
				</div>
				<div class="flex items-center gap-2">
					<Checkbox id="ks-check" bind:checked />
					<Label for="ks-check">Include archived</Label>
				</div>
				<Select.Root type="single" bind:value={status}>
					<Select.Trigger class="w-full">{status}</Select.Trigger>
					<Select.Content>
						<Select.Item value="active" label="Active">Active</Select.Item>
						<Select.Item value="on-hold" label="On hold">On hold</Select.Item>
						<Select.Item value="complete" label="Complete">Complete</Select.Item>
					</Select.Content>
				</Select.Root>
			</Card.Content>
			<Card.Footer class="gap-2">
				<Button size="sm" onclick={() => toast.success('Saved')}>Save</Button>
				<Button size="sm" variant="outline">Cancel</Button>
			</Card.Footer>
		</Card.Root>

		<Card.Root>
			<Card.Header><Card.Title>Feedback and overlays</Card.Title></Card.Header>
			<Card.Content class="space-y-3">
				<Alert>
					<AlertTitle>Reporting is behind</AlertTitle>
					<AlertDescription>Two periods have no recorded progress.</AlertDescription>
				</Alert>
				<Progress value={68} />
				<div class="flex items-center gap-3">
					<Avatar.Root><Avatar.Fallback>MZ</Avatar.Fallback></Avatar.Root>
					<Skeleton class="h-8 flex-1" />
				</div>
				<Separator />
				<div class="flex flex-wrap gap-2">
					<Dialog.Root>
						<Dialog.Trigger>
							{#snippet child({ props })}
								<Button {...props} size="sm" variant="outline">Dialog</Button>
							{/snippet}
						</Dialog.Trigger>
						<Dialog.Content>
							<Dialog.Header>
								<Dialog.Title>Dialog title</Dialog.Title>
								<Dialog.Description>Overlays sit on the popover token.</Dialog.Description>
							</Dialog.Header>
						</Dialog.Content>
					</Dialog.Root>

					<AlertDialog.Root>
						<AlertDialog.Trigger>
							{#snippet child({ props })}
								<Button {...props} size="sm" variant="destructive">Delete</Button>
							{/snippet}
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Delete this project?</AlertDialog.Title>
								<AlertDialog.Description>This cannot be undone.</AlertDialog.Description>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<AlertDialog.Action>Delete</AlertDialog.Action>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>

					<Popover.Root>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button {...props} size="sm" variant="outline">Popover</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="text-xs">Popover content</Popover.Content>
					</Popover.Root>

					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<Button {...props} size="sm" variant="outline">Menu</Button>
							{/snippet}
						</DropdownMenu.Trigger>
						<DropdownMenu.Content>
							<DropdownMenu.Item>Edit</DropdownMenu.Item>
							<DropdownMenu.Item>Archive</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>

					<Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigger>
								{#snippet child({ props })}
									<Button {...props} size="sm" variant="ghost">Tooltip</Button>
								{/snippet}
							</Tooltip.Trigger>
							<Tooltip.Content>Tooltip content</Tooltip.Content>
						</Tooltip.Root>
					</Tooltip.Provider>
				</div>
			</Card.Content>
		</Card.Root>
	</section>

	<section class="space-y-3">
		<h2 class="text-xs font-medium tracking-widest text-muted-foreground uppercase">
			Tabs and table
		</h2>
		<Tabs.Root value="progress">
			<Tabs.List>
				<Tabs.Trigger value="progress">Progress</Tabs.Trigger>
				<Tabs.Trigger value="boq">BOQ</Tabs.Trigger>
				<Tabs.Trigger value="schedule">Schedule</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="progress">
				<Card.Root>
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Section</Table.Head>
								<Table.Head class="text-right">Planned</Table.Head>
								<Table.Head class="text-right">Actual</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each ROWS as [section, planned, actual, state] (section)}
								<Table.Row>
									<Table.Cell>{section}</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{planned}%</Table.Cell>
									<Table.Cell class="text-right tabular-nums">{actual}%</Table.Cell>
									<Table.Cell><Badge variant="secondary">{state}</Badge></Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</Card.Root>
			</Tabs.Content>
			<Tabs.Content value="boq">Bill of quantities</Tabs.Content>
			<Tabs.Content value="schedule">Schedule</Tabs.Content>
		</Tabs.Root>
	</section>
</div>
