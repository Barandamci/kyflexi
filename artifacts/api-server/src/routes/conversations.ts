import { Router, type IRouter } from "express";
import { and, eq, or, desc } from "drizzle-orm";
import { db, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import {
  ListConversationsQueryParams,
  ListConversationsResponse,
  CreateConversationBody,
  GetConversationParams,
  GetConversationResponse,
  MarkConversationReadParams,
  MarkConversationReadBody,
  MarkConversationReadResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/conversations", async (req, res): Promise<void> => {
  const query = ListConversationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const userId = query.data.userId;

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.user1Id, userId),
        eq(conversationsTable.user2Id, userId)
      )
    )
    .orderBy(desc(conversationsTable.createdAt));

  const result = await Promise.all(
    convs.map(async (conv) => {
      const otherUserId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
      const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId));

      const messages = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .orderBy(desc(messagesTable.sentAt))
        .limit(1);

      const lastMsg = messages[0] ?? null;

      const unreadMessages = await db
        .select()
        .from(messagesTable)
        .where(
          and(
            eq(messagesTable.conversationId, conv.id),
            eq(messagesTable.isRead, false)
          )
        );
      const unreadCount = unreadMessages.filter(m => m.senderId !== userId).length;

      return {
        id: conv.id,
        createdAt: conv.createdAt,
        otherUser,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              senderId: lastMsg.senderId,
              sentAt: lastMsg.sentAt,
            }
          : null,
        unreadCount,
      };
    })
  );

  res.json(ListConversationsResponse.parse(result));
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { user1Id, user2Id } = parsed.data;

  const existing = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        and(eq(conversationsTable.user1Id, user1Id), eq(conversationsTable.user2Id, user2Id)),
        and(eq(conversationsTable.user1Id, user2Id), eq(conversationsTable.user2Id, user1Id))
      )
    );

  if (existing.length > 0) {
    const conv = existing[0];
    const [u1] = await db.select().from(usersTable).where(eq(usersTable.id, conv.user1Id));
    const [u2] = await db.select().from(usersTable).where(eq(usersTable.id, conv.user2Id));
    res.status(201).json(GetConversationResponse.parse({ ...conv, user1: u1, user2: u2 }));
    return;
  }

  const [conv] = await db.insert(conversationsTable).values({ user1Id, user2Id }).returning();
  const [u1] = await db.select().from(usersTable).where(eq(usersTable.id, conv.user1Id));
  const [u2] = await db.select().from(usersTable).where(eq(usersTable.id, conv.user2Id));

  res.status(201).json(GetConversationResponse.parse({ ...conv, user1: u1, user2: u2 }));
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Konuşma bulunamadı" });
    return;
  }

  const [u1] = await db.select().from(usersTable).where(eq(usersTable.id, conv.user1Id));
  const [u2] = await db.select().from(usersTable).where(eq(usersTable.id, conv.user2Id));

  res.json(GetConversationResponse.parse({ ...conv, user1: u1, user2: u2 }));
});

router.post("/conversations/:id/read", async (req, res): Promise<void> => {
  const params = MarkConversationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = MarkConversationReadBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(
      and(
        eq(messagesTable.conversationId, params.data.id),
        eq(messagesTable.isRead, false)
      )
    );

  const toUpdate = messages.filter(m => m.senderId !== body.data.userId);

  for (const msg of toUpdate) {
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(eq(messagesTable.id, msg.id));
  }

  res.json(MarkConversationReadResponse.parse({ updated: toUpdate.length }));
});

export default router;
