import { expect, test } from "bun:test";
import { call } from "@orpc/server";

import type { Context } from "./context";
import { organizationProcedure } from "./index";

const organization = {
  id: "organization-current",
  membershipId: "membership-1",
  name: "Current Organization",
  role: "admin",
};

const organizationProbe = organizationProcedure.handler(({ context }) => context.organization);

test("a stale organization cookie falls back to the user's sole membership", async () => {
  const queries: unknown[] = [];
  const membership = {
    id: organization.membershipId,
    organizationId: organization.id,
    role: "ADMIN",
    organization: { name: organization.name },
    user: { role: "user" },
  };
  const database = {
    organizationMembership: {
      findMany: (query: { where: { organizationId?: string } }) => {
        queries.push(query);
        return query.where.organizationId ? [] : [membership];
      },
    },
  };
  const context = {
    auth: null,
    database,
    headers: new Headers({ cookie: "dashboardpt2.company=organization-deleted" }),
    session: { user: { id: "user-1", role: "user" } },
  } as unknown as Context;

  await expect(call(organizationProbe, undefined, { context })).resolves.toEqual(organization);
  expect(queries).toHaveLength(2);
});

test("an explicit unknown organization remains a not-found error", async () => {
  const database = {
    organizationMembership: {
      findMany: () => [],
    },
  };
  const context = {
    auth: null,
    database,
    headers: new Headers({
      cookie: `dashboardpt2.company=${organization.id}`,
      "x-organization-id": "organization-unknown",
    }),
    session: { user: { id: "user-1", role: "user" } },
  } as unknown as Context;

  await expect(call(organizationProbe, undefined, { context })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
});
