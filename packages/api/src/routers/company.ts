import { organizationProcedure } from "../index";

export const companyRouter = {
  /**
   * Which company the dashboard is showing, and what else it could show.
   *
   * System accounts get every company and a picker; a company-pinned account
   * gets only its own and `canSwitch: false`, so setting the cookie cannot
   * widen what it sees.
   */
  options: organizationProcedure.handler(({ context }) => {
    return {
      companies: [{ id: context.organization.id, name: context.organization.name }],
      activeId: context.organization.id,
      canSwitch: false,
    };
  }),
};
