import { Router, type IRouter } from "express";
import { eq, desc, asc } from "drizzle-orm";
import { db, usersTable, groupsTable, groupMembersTable, groupMessagesTable } from "@workspace/db";
import { broadcastToUsers } from "../lib/websocket";

const router: IRouter = Router();

router.get("/groups", async (req, res): Promise<void> => {
  const userId = Number(req.query.userId);
  if (!userId || isNaN(userId)) {
    res.status(400).json({ error: "userId gerekli" });
    return;
  }

  const memberships = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);

  if (groupIds.length === 0) {
    res.json([]);
    return;
  }

  const result = await Promise.all(
    groupIds.map(async (groupId) => {
      const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
      if (!group) return null;

      const members = await db
        .select()
        .from(usersTable)
        .innerJoin(groupMembersTable, eq(groupMembersTable.userId, usersTable.id))
        .where(eq(groupMembersTable.groupId, groupId));

      const lastMessages = await db
        .select()
        .from(groupMessagesTable)
        .where(eq(groupMessagesTable.groupId, groupId))
        .orderBy(desc(groupMessagesTable.sentAt))
        .limit(1);

      const lastMsg = lastMessages[0] ?? null;

      return {
        id: group.id,
        name: group.name,
        avatarUrl: group.avatarUrl,
        createdAt: group.createdAt,
        members: members.map((m) => m.users),
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              senderId: lastMsg.senderId,
              sentAt: lastMsg.sentAt,
            }
          : null,
      };
    })
  );

  res.json(result.filter(Boolean));
});

router.post("/groups", async (req, res): Promise<void> => {
  const { name, memberIds, avatarUrl } = req.body as {
    name: string;
    memberIds: number[];
    avatarUrl?: string | null;
  };

  if (!name || !Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400).json({ error: "name ve memberIds gerekli" });
    return;
  }

  const [group] = await db
    .insert(groupsTable)
    .values({ name, avatarUrl: avatarUrl ?? null })
    .returning();

  await Promise.all(
    memberIds.map((uid) =>
      db.insert(groupMembersTable).values({ groupId: group.id, userId: uid })
    )
  );

  const members = await db
    .select()
    .from(usersTable)
    .innerJoin(groupMembersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, group.id));

  res.status(201).json({
    id: group.id,
    name: group.name,
    avatarUrl: group.avatarUrl,
    createdAt: group.createdAt,
    members: members.map((m) => m.users),
  });
});

router.get("/groups/:id", async (req, res): Promise<void> => {
  const groupId = Number(req.params.id);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId));
  if (!group) {
    res.status(404).json({ error: "Grup bulunamadı" });
    return;
  }

  const members = await db
    .select()
    .from(usersTable)
    .innerJoin(groupMembersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, groupId));

  res.json({
    id: group.id,
    name: group.name,
    avatarUrl: group.avatarUrl,
    createdAt: group.createdAt,
    members: members.map((m) => m.users),
  });
});

router.get("/groups/:id/messages", async (req, res): Promise<void> => {
  const groupId = Number(req.params.id);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }

  const messages = await db
    .select()
    .from(groupMessagesTable)
    .where(eq(groupMessagesTable.groupId, groupId))
    .orderBy(asc(groupMessagesTable.sentAt));

  const messagesWithSender = await Promise.all(
    messages.map(async (msg) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
      return { ...msg, sender };
    })
  );

  res.json(messagesWithSender);
});

router.post("/groups/:id/messages", async (req, res): Promise<void> => {
  const groupId = Number(req.params.id);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }

  const { senderId, content } = req.body as { senderId: number; content: string };
  if (!senderId || !content) {
    res.status(400).json({ error: "senderId ve content gerekli" });
    return;
  }

  const [msg] = await db
    .insert(groupMessagesTable)
    .values({ groupId, senderId, content })
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
  const fullMsg = { ...msg, sender };

  const members = await db
    .select()
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, groupId));

  const otherMemberIds = members
    .map((m) => m.userId)
    .filter((id) => id !== senderId);

  broadcastToUsers(otherMemberIds, {
    type: "new_group_message",
    groupId,
    message: fullMsg,
  });

  res.status(201).json(fullMsg);
});

router.post("/groups/:id/members", async (req, res): Promise<void> => {
  const groupId = Number(req.params.id);
  if (isNaN(groupId)) {
    res.status(400).json({ error: "Geçersiz id" });
    return;
  }

  const { userId } = req.body as { userId: number };
  if (!userId) {
    res.status(400).json({ error: "userId gerekli" });
    return;
  }

  await db.insert(groupMembersTable).values({ groupId, userId });
  res.status(201).json({ success: true });
});

export default router;
