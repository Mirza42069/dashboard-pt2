/**
 * Which agent turn is allowed to animate.
 *
 * The run timeline staggers itself in when a turn has just been produced, and
 * sits still when a thread is read back. Those two cases render the identical
 * component from the identical stored data, so something outside the data has
 * to say which is which — a boolean on the message would mean writing "this was
 * once new" to the database, which is not a fact about the turn.
 *
 * Module scope, so it survives the navigation and panel re-render that
 * happens the moment a thread is created. Read once and cleared: a reload, a
 * revisit, or opening the thread from History all find it empty and render the
 * run as history, which is what it is by then.
 */
let liveMessageId = $state<string | null>(null);

export function markLive(messageId: string) {
	liveMessageId = messageId;
}

export function takeLive(): string | null {
	const id = liveMessageId;
	liveMessageId = null;
	return id;
}
