import { getContext, setContext } from "svelte";

const KEY = Symbol("progress");

/** Read by ProgressIndicator and ProgressValue, which sit below Root's slot. */
export type ProgressState = {
	readonly value: number | null | undefined;
	readonly max: number;
};

export function setProgressState(state: ProgressState) {
	setContext(KEY, state);
}

export function getProgressState(): ProgressState {
	const state = getContext<ProgressState | undefined>(KEY);
	if (!state) throw new Error("Progress sub-components must be used inside <Progress>");
	return state;
}
