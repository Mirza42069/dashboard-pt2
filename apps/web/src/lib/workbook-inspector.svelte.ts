/**
 * What the grid has selected, published for the agent panel to read.
 *
 * The panel lives in the app shell and the grid lives in a route, so they have
 * no component relationship to pass props through — the shell is the grid's
 * ancestor, and a prop cannot travel upwards. Module scope is the same tool
 * chat-live.svelte.ts already uses for the same reason.
 *
 * Deliberately a snapshot rather than a live handle on the grid: the panel
 * renders what was selected and asks the server to explain it, and never
 * reaches back to change a cell. Corrections are typed into the grid, which
 * keeps one writer for the workbook.
 */

export type InspectorIssue = {
	id: string;
	code: string;
	fieldKey: string;
	severity: string;
	rowId: string;
	/** "Faktur!12" — where the reader would find it in their own workbook. */
	locator: string;
};

export type InspectorCell = {
	/** Spreadsheet address, e.g. "C12" — what the formula bar shows. */
	address: string;
	fieldKey: string;
	value: string;
	issue: InspectorIssue | null;
};

export type WorkbookInspector = {
	batchId: string;
	documentLabel: string;
	selected: InspectorCell | null;
	issues: InspectorIssue[];
};

let current = $state<WorkbookInspector | null>(null);

/** Set by the workbook route; cleared when it unmounts. */
export function setWorkbookInspector(next: WorkbookInspector | null) {
	current = next;
}

export function workbookInspector(): WorkbookInspector | null {
	return current;
}

/**
 * Lets the panel drive the grid's selection for the one case where it must: a
 * reader clicking an issue in the list expects the grid to move to that cell.
 * The grid registers a handler while it is mounted.
 */
let focusHandler: ((issue: InspectorIssue) => void) | null = null;

export function setInspectorFocusHandler(handler: ((issue: InspectorIssue) => void) | null) {
	focusHandler = handler;
}

export function focusInspectorIssue(issue: InspectorIssue) {
	focusHandler?.(issue);
}
