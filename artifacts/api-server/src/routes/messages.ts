import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, usersTable, messagesTable } from "@workspace/db";
import {
  ListMessagesParams,
  ListMessagesResponse,
  SendMessageParams,
  SendMessageBody,
  DeleteMessageParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(asc(messagesTable.sentAt));

  const messagesWithSender = await Promise.all(
    messages.map(async (msg) => {
      const [sender] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, msg.senderId));
      return { ...msg, sender };
    })
  );

  res.json(ListMessagesResponse.parse(messagesWithSender));
});

router.post("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = SendMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [msg] = await db
    .insert(messagesTable)
    .values({
      conversationId: params.data.id,
      senderId: body.data.senderId,
      content: body.data.content,
      isRead: false,
    })
    .returning();

  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));

  res.status(201).json({ ...msg, sender });
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const params = DeleteMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [msg] = await db
    .delete(messagesTable)
    .where(eq(messagesTable.id, params.data.id))
    .returning();

  if (!msg) {
    res.status(404).json({ error: "Mesaj bulunamadı" });
    return;
  }

  res.sendStatus(204);
});

export default router;
