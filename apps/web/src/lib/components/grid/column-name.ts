/**
 * 0 -> "A", 25 -> "Z", 26 -> "AA".
 *
 * Spreadsheet column letters are bijective base-26 — there is no zero digit, so
 * the usual divmod loop is off by one at every carry and produces "BA" where
 * Excel says "AA". The `value -= 1` before each digit is what makes it bijective.
 *
 * Extracted from the workbook route, which is where it lived when the grid was
 * one 479-line file.
 */
export function columnName(index: number): string {
	let value = index + 1;
	let name = "";
	while (value > 0) {
		value -= 1;
		name = String.fromCharCode(65 + (value % 26)) + name;
		value = Math.floor(value / 26);
	}
	return name;
}
