import type { RouterClient } from "@orpc/server";

import { publicProcedure } from "../index";
import { activityRouter } from "./activity";
import { companyRouter } from "./company";
import { dashboardRouter } from "./dashboard";
import { exceptionsRouter } from "./exceptions";
import { importBatchRouter } from "./import-batch";
import { projectRouter } from "./project";
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

  // Temporary frontend adapters. Remove with the construction dashboard shell.
  activity: activityRouter,
  company: companyRouter,
  project: projectRouter,
  support: supportRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
