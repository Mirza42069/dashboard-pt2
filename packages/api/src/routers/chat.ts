import { ORPCError } from "@orpc/server";
import z from "zod";

import { runAgent, titleFromMessage, type UserBody } from "../lib/agent-script";
import { chatDatabase } from "../lib/chat-database";
import { serializeFinanceValue } from "../lib/serialize-finance";
import { organizationProcedure } from "../index";

const id = z.string().trim().min(1).max(191);

/**
 * Recorded, not stored.
 *
 * The schema has nowhere to put a file and this product is not gaining blob
 * storage as a side effect of a UI change, so an attachment is its name, size
 * and type — enough for the thread to show what the question was about. The
 * composer says as much rather than implying an upload happened.
 */
const attachment = z.object({
  name: z.string().trim().min(1).max(255),
  sizeBytes: z.number().int().min(0).max(2_000_000_000),
  type: z.string().trim().max(255),
});

const sendMessage = z.object({
  /** Absent on the first turn — that is what creates the thread. */
  conversationId: id.optional(),
  text: z.string().trim().min(1).max(4_000),
  attachments: z.array(attachment).max(10).default([]),
  reconciliationId: id.optional(),
});

/**
 * Threads, and the agent that answers in them.
 *
 * Every procedure is scoped to the organization *and* to the calling user.
 * That is stricter than the finance routers on purpose: a reconciliation belongs
 * to the company and any member with the role may act on it, but a conversation
 * is the record of one person asking for something.
 */
export const chatRouter = {
  conversations: {
    list: organizationProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
      .handler(async ({ context, input }) => {
        const database = chatDatabase(context.database);
        const rows = await database.conversation.findMany({
          where: { organizationId: context.organization.id, userId: context.session.user.id },
          orderBy: [{ updatedAt: "desc" }],
          take: input?.limit ?? 30,
          include: {
            _count: { select: { messages: true } },
            // The last turn, for the preview line in the history row. One nested
            // take beats a second round trip per row.
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        });

        return serializeFinanceValue({
          items: rows.map((row) => ({
            id: row.id,
            title: row.title,
            turns: row._count.messages,
            updatedAt: row.updatedAt,
            lastTurn: row.messages[0]
              ? { role: row.messages[0].role, body: row.messages[0].body }
              : null,
          })),
        });
      }),

    get: organizationProcedure.input(z.object({ id })).handler(async ({ context, input }) => {
      const database = chatDatabase(context.database);
      const row = await database.conversation.findFirst({
        where: {
          id: input.id,
          organizationId: context.organization.id,
          userId: context.session.user.id,
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!row) throw new ORPCError("NOT_FOUND", { message: "Conversation not found." });
      return serializeFinanceValue(row);
    }),

    /**
     * One turn of the conversation, question and answer together.
     *
     * The agent runs *before* the transaction opens and both turns are written
     * inside it, so a thread can never come to rest holding a question with no
     * answer. Running the agent inside would hold a database transaction open
     * across every query it makes, for no benefit — it only reads.
     */
    send: organizationProcedure.input(sendMessage).handler(async ({ context, input }) => {
      const database = chatDatabase(context.database);
      const organizationId = context.organization.id;
      const userId = context.session.user.id;

      if (input.conversationId) {
        const existing = await database.conversation.findFirst({
          where: { id: input.conversationId, organizationId, userId },
          select: { id: true },
        });
        if (!existing) throw new ORPCError("NOT_FOUND", { message: "Conversation not found." });
      }

      if (input.reconciliationId) {
        const workbook = await context.database.reconciliation.findFirst({
          where: { id: input.reconciliationId, organizationId },
          select: { id: true },
        });
        if (!workbook) throw new ORPCError("NOT_FOUND", { message: "Workbook not found." });
      }

      const agent = await runAgent(context.database, {
        organizationId,
        message: input.text,
        reconciliationId: input.reconciliationId,
      });
      const userBody: UserBody = { text: input.text, attachments: input.attachments };

      const conversation = await database.$transaction(async (transaction) => {
        const thread = input.conversationId
          ? await transaction.conversation.update({
              where: { id: input.conversationId },
              // Touched so the thread rises to the top of the history list; the
              // @updatedAt column needs a write to fire.
              data: { updatedAt: new Date() },
            })
          : await transaction.conversation.create({
              data: { organizationId, userId, title: titleFromMessage(input.text) },
            });

        await transaction.chatMessage.create({
          data: { organizationId, conversationId: thread.id, role: "USER", body: userBody },
        });
        await transaction.chatMessage.create({
          data: { organizationId, conversationId: thread.id, role: "AGENT", body: agent },
        });

        return transaction.conversation.findFirstOrThrow({
          where: { id: thread.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
      });

      return serializeFinanceValue(conversation);
    }),

    rename: organizationProcedure
      .input(z.object({ id, title: z.string().trim().min(1).max(120) }))
      .handler(async ({ context, input }) => {
        const database = chatDatabase(context.database);
        const { count } = await database.conversation.updateMany({
          where: {
            id: input.id,
            organizationId: context.organization.id,
            userId: context.session.user.id,
          },
          data: { title: input.title },
        });
        if (count === 0) throw new ORPCError("NOT_FOUND", { message: "Conversation not found." });
        return { id: input.id, title: input.title };
      }),

    remove: organizationProcedure.input(z.object({ id })).handler(async ({ context, input }) => {
      const database = chatDatabase(context.database);
      // deleteMany rather than delete: the where clause carries the ownership
      // check, so there is no window between reading the row and deleting it.
      // The messages go with it — ChatMessage cascades, unlike anything in the
      // finance schema, because a thread is not an audit record.
      const { count } = await database.conversation.deleteMany({
        where: {
          id: input.id,
          organizationId: context.organization.id,
          userId: context.session.user.id,
        },
      });
      if (count === 0) throw new ORPCError("NOT_FOUND", { message: "Conversation not found." });
      return { id: input.id };
    }),
  },
};
