import { APP_COOKIES } from "@DashboardPT2/api/lib/cookies";

export const AGENT_PANEL_COOKIE = APP_COOKIES.agentPanel;

/**
 * Pane sizes are percentages because that is the unit paneforge works in — it
 * lays panes out as fractions of the group, so a width stored in pixels would
 * have to be converted against a container width the server does not know.
 */
export const DEFAULT_AGENT_PANEL_SIZE = 26;
export const MIN_AGENT_PANEL_SIZE = 18;
export const MAX_AGENT_PANEL_SIZE = 46;

export type AgentPanelState = {
  collapsed: boolean;
  /** Percentage of the shell's width. Retained while collapsed so reopening restores it. */
  size: number;
};

export const DEFAULT_AGENT_PANEL: AgentPanelState = {
  collapsed: false,
  size: DEFAULT_AGENT_PANEL_SIZE,
};

export function clampAgentPanelSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_AGENT_PANEL_SIZE;
  return Math.min(MAX_AGENT_PANEL_SIZE, Math.max(MIN_AGENT_PANEL_SIZE, size));
}

/**
 * Serialized as `collapsed:<size>` — one cookie carrying both facts.
 *
 * The size travels even when collapsed on purpose: a rail you reopen at
 * somebody else's default width, rather than the width you dragged it to, reads
 * as the app forgetting. Two cookies would do the same job, but the two values
 * are only ever written together.
 *
 * Read server-side and handed to the shell as an initial pane size, for the
 * reason every other preference here is a cookie: the alternative is a correct
 * layout arriving one frame after a wrong one.
 */
export function resolveAgentPanel(value: string | undefined): AgentPanelState {
  if (!value) return DEFAULT_AGENT_PANEL;
  const [collapsed, rawSize] = value.split(":");
  return {
    collapsed: collapsed === "collapsed",
    size: clampAgentPanelSize(Number(rawSize)),
  };
}

export function serializeAgentPanel(state: AgentPanelState): string {
  return `${state.collapsed ? "collapsed" : "open"}:${Math.round(clampAgentPanelSize(state.size))}`;
}

export function writeAgentPanelCookie(state: AgentPanelState) {
  document.cookie = `${AGENT_PANEL_COOKIE}=${serializeAgentPanel(state)}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; samesite=lax`;
}
