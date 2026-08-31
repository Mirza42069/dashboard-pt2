import { auth } from "@DashboardPT2/auth";
import { hasPermission, type Permission, roleOf } from "@DashboardPT2/api/lib/permissions";
import { trialHasEnded } from "@DashboardPT2/api/lib/trial";
import { redirect, type RequestEvent } from "@sveltejs/kit";

/**
 * Resolves the real session. hooks.server.ts only wires better-auth's own
 * routes, so this is the authoritative check — every protected load must call
 * one of the helpers below.
 *
 * Resolved in-process rather than over HTTP to an API service: better-auth's
 * get-session handler is a millisecond or two, and a round trip wrapping it
 * would be almost pure waiting, on every protected render.
 */
export async function getSession(event: RequestEvent) {
  try {
    return await auth.api.getSession({ headers: event.request.headers });
  } catch {
    // A revoked, expired or banned session resolves to "not signed in".
    return null;
  }
}

type RequireSessionOptions = {
  /** Set on /trial-ended itself, for the same reason. */
  skipTrialEndedRedirect?: boolean;
};

export async function requireSession(
  event: RequestEvent,
  options: RequireSessionOptions = {},
) {
  const session = await getSession(event);
  const account = session?.user;

  if (!account) {
    redirect(302, "/login");
  }

  const user = account;

  if (user.mustChangePassword) {
    redirect(302, "/set-password?error=SETUP_REQUIRED");
  }

  // Sign-in can already be refused for a lapsed trial, but that check fires
  // only when a session is created — one opened five minutes before the
  // deadline outlives it. This catches that one, on the next navigation.
  if (!options.skipTrialEndedRedirect && trialHasEnded(user)) {
    redirect(302, "/trial-ended");
  }

  return { session, user };
}

/** Redirects to the dashboard unless the signed-in account holds `permission`. */
export async function requirePermission(event: RequestEvent, permission: Permission) {
  const resolved = await requireSession(event);

  if (!hasPermission(roleOf(resolved.user), permission)) {
    redirect(302, "/dashboard");
  }

  return resolved;
}
