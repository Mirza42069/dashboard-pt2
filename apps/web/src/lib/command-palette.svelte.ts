/**
 * Whether the ⌘K palette is showing.
 *
 * Module scope because two unrelated components need it: the palette itself,
 * mounted once by the shell, and the header's ⌘K affordance, which is a
 * sibling. The alternative — the header synthesising a keyboard event for the
 * palette's own listener to catch — makes a real interaction depend on a fake
 * one, and breaks the moment the shortcut changes.
 */
let open = $state(false);

export function commandPaletteOpen() {
	return open;
}

export function setCommandPaletteOpen(next: boolean) {
	open = next;
}

export function toggleCommandPalette() {
	open = !open;
}
