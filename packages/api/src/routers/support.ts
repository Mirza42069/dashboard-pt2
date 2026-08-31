import { organizationProcedure } from "../index";

export const supportRouter = {
  unreadCount: organizationProcedure.handler(() => ({ unread: 0 })),
};
