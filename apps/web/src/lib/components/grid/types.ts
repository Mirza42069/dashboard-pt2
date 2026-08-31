import type { InspectorIssue } from "../../workbook-inspector.svelte";

/**
 * The grid's own model, built by the route from whatever `listRows` returned.
 *
 * Deliberately not the API shape. A Faktur import has one row per invoice, a
 * DetailFaktur view has one row per line item inside an invoice, and the two
 * address their cells differently — `TaxInvoiceDate` against
 * `GoodsServices.2.UnitPrice`. Flattening both into this before the grid sees
 * them is what lets one component render either, and keeps the patch target an
 * explicit field on the cell rather than something the grid has to reconstruct
 * from its own coordinates.
 */

export type GridColumn = {
	/** The Coretax field name, shown under the column letter. */
	label: string;
};

export type GridCell = {
	/** What `importBatch.patchCell` is given. */
	fieldKey: string;
	value: string;
	issue: InspectorIssue | null;
};

export type GridRow = {
	/** Stable DOM key. The ImportRow id, plus a line index in the detail view. */
	key: string;
	/** The ImportRow this cell patches — detail lines share their invoice's. */
	rowId: string;
	/** Optimistic-concurrency token, passed straight back to patchCell. */
	version: number;
	/** Gutter label: the row number in the user's own file, e.g. "12" or "12.1". */
	label: string;
	/** "Faktur!12" — how an issue names its place. */
	locator: string;
	cells: GridCell[];
};

/** Which cell the reader is on. Row and column are indices into the model. */
export type GridPosition = { row: number; col: number };
