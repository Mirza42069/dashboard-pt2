import { ORPCError, os } from "@orpc/server";

import type { Context } from "./context";
import { readAppCookie } from "./lib/cookies";
import { financeDatabase, objectField, stringField } from "./lib/finance-database";
import { normalizedFinanceRole } from "./lib/finance-permissions";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  return next({
    context: {
      auth: context.auth,
      database: context.database,
      headers: context.headers,
      session: context.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

const requireOrganization = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const database = financeDatabase(context.database);
  const headerOrganizationId = context.headers.get("x-organization-id");
  const cookieOrganizationId = readAppCookie(context.headers, "company");
  let requestedOrganizationId = headerOrganizationId ?? cookieOrganizationId;
  let memberships = await database.organizationMembership.findMany({
    where: {
      userId: context.session.user.id,
      ...(requestedOrganizationId ? { organizationId: requestedOrganizationId } : {}),
    },
    include: { organization: true, user: true },
    take: requestedOrganizationId ? 1 : 2,
  });

  if (memberships.length === 0 && !headerOrganizationId && cookieOrganizationId) {
    requestedOrganizationId = undefined;
    memberships = await database.organizationMembership.findMany({
      where: { userId: context.session.user.id },
      include: { organization: true, user: true },
      take: 2,
    });
  }

  if (memberships.length === 0) {
    throw new ORPCError(requestedOrganizationId ? "NOT_FOUND" : "FORBIDDEN", {
      message: requestedOrganizationId
        ? "Organization not found."
        : "The account does not belong to an organization.",
    });
  }
  if (!requestedOrganizationId && memberships.length > 1) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Select an organization with the x-organization-id header.",
    });
  }

  const membership = memberships[0]!;
  const organizationId = stringField(membership, "organizationId");
  if (!organizationId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Organization membership is invalid.",
    });
  }
  const memberUser = objectField(membership, "user");
  const sessionUser = context.session.user as { role?: string | null };
  const role = normalizedFinanceRole(
    stringField(membership, "role") ??
      (memberUser ? stringField(memberUser, "role") : null) ??
      sessionUser.role,
  );

  return next({
    context: {
      auth: context.auth,
      database: context.database,
      headers: context.headers,
      session: context.session,
      organization: {
        id: organizationId,
        membershipId: stringField(membership, "id") ?? "",
        name: stringField(objectField(membership, "organization") ?? {}, "name") ?? organizationId,
        role,
      },
    },
  });
});

export const organizationProcedure = protectedProcedure.use(requireOrganization);
