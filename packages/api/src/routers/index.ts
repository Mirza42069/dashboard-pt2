import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { activityRouter } from "./activity";
import { adminRouter } from "./admin";
import { chatRouter } from "./chat";
import { companyRouter } from "./company";
import { dashboardRouter } from "./dashboard";
import { exceptionsRouter } from "./exceptions";
import { importBatchRouter } from "./import-batch";
import { reconciliationRouter } from "./reconciliation";
import { supportRouter } from "./support";
import { workflowRouter } from "./workflow";

export const appRouter = {
  healthCheck: publicProcedure.handler(async ({ context }) => {
    await context.database.$queryRawUnsafe("SELECT 1");
    return "OK";
  }),
  dashboard: dashboardRouter,
  reconciliation: reconciliationRouter,
  importBatch: importBatchRouter,
  exceptions: exceptionsRouter,
  workflow: workflowRouter,
  admin: adminRouter,

  /**
   * The agent surface. `chat.conversations.send` is the only procedure the
   * product's primary screen calls; everything above it is what the agent reads
   * to answer, and what a result card links into.
   */
  chat: chatRouter,

  // Shell services: the activity feed, the organization label, and the support
  // unread badge. The construction-dashboard adapters that used to sit here are
  // gone — project.summary in particular invented a completion percentage out of
  // reconciliation statuses, which is not a number this product should own.
  activity: activityRouter,
  company: companyRouter,
  support: supportRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
