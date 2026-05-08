import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, conversationsTable, messagesTable } from "@workspace/db";
import {
  ListUsersResponse,
  CreateUserBody,
  GetUserParams,
  GetUserResponse,
  GetUserStatsParams,
  GetUserStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(ListUsersResponse.parse(users));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(GetUserResponse.parse(user));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }
  res.json(GetUserResponse.parse(user));
});

router.get("/users/:id/stats", async (req, res): Promise<void> => {
  const params = GetUserStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = params.data.id;

  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(
      eq(conversationsTable.user1Id, userId)
    );

  const conversations2 = await db
    .select()
    .from(conversationsTable)
    .where(
      eq(conversationsTable.user2Id, userId)
    );

  const allConversationIds = [...conversations, ...conversations2].map(c => c.id);

  const sentMessages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.senderId, userId));

  let totalUnread = 0;
  for (const conv of [...conversations, ...conversations2]) {
    const unreadMessages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conv.id));
    const unread = unreadMessages.filter(m => !m.isRead && m.senderId !== userId);
    totalUnread += unread.length;
  }

  res.json(
    GetUserStatsResponse.parse({
      totalConversations: allConversationIds.length,
      totalMessagesSent: sentMessages.length,
      totalUnread,
    })
  );
});

export default router;
