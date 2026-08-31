import { auth } from "@DashboardPT2/auth";
import database from "@DashboardPT2/db";
import { json } from "@sveltejs/kit";
import z from "zod";

import { getSession } from "$lib/session";

import type { RequestHandler } from "./$types";

const input = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

export const POST: RequestHandler = async (event) => {
  const session = await getSession(event);
  if (!session?.user) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const parsed = input.safeParse(await event.request.json().catch(() => null));
  if (!parsed.success || parsed.data.currentPassword === parsed.data.newPassword) {
    return json({ error: "INVALID_PASSWORD" }, { status: 400 });
  }

  try {
    await auth.api.changePassword({
      headers: event.request.headers,
      body: {
        ...parsed.data,
        revokeOtherSessions: true,
      },
    });
    await database.user.update({
      where: { id: session.user.id },
      data: { mustChangePassword: false },
    });
    return json({ ok: true });
  } catch {
    return json({ error: "PASSWORD_CHANGE_FAILED" }, { status: 400 });
  }
};
