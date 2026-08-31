import type { AppRouterClient } from "@DashboardPT2/api/routers/index";
import type { Locale } from "./i18n";
import type { AgentPanelState } from "./lib/agent-panel";
import type { TextScale } from "./lib/text-scale";
import type { Theme } from "./lib/theme";

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  var $client: AppRouterClient | undefined;

  namespace App {
    /** Read once per request from cookies in hooks.server.ts. */
    interface Preferences {
      locale: Locale;
      theme: Theme;
      textScale: TextScale;
      sidebarCollapsed: boolean;
      agentPanel: AgentPanelState;
    }

    interface Locals {
      preferences: Preferences;
    }
    // interface Error {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
