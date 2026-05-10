import { Router, type IRouter } from "express";
import { eq, or, and } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  usersTable,
  conversationsTable,
  messagesTable,
} from "@workspace/db";

const router: IRouter = Router();

const OWNER_EMAIL = "barandamci@icloud.com";

const AdminUserIdParams = z.object({ id: z.coerce.number().int().positive() });

const SetTickBody = z.object({
  tickType: z.enum(["blue", "black", "orange"]).nullable(),
});

const BanBody = z.object({
  reason: z.string().min(1),
});

router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db
    .select()
    .from(usersTable)
    .orderBy(usersTable.createdAt);
  res.json(users);
});

router.patch("/admin/users/:id/tick", async (req, res): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const body = SetTickBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Geçersiz tık tipi" }); return; }

  const [user] = await db
    .update(usersTable)
    .set({ tickType: body.data.tickType ?? undefined })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
  res.json(user);
});

router.delete("/admin/users/:id/tick", async (req, res): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const [user] = await db
    .update(usersTable)
    .set({ tickType: null })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
  res.json(user);
});

router.post("/admin/users/:id/ban", async (req, res): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const body = BanBody.safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Açıklama gerekli" }); return; }

  const [user] = await db
    .update(usersTable)
    .set({ isBanned: true, banReason: body.data.reason })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
  res.json(user);
});

router.delete("/admin/users/:id/ban", async (req, res): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const [user] = await db
    .update(usersTable)
    .set({ isBanned: false, banReason: null })
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
  res.json(user);
});

router.get("/admin/users/:id/conversations", async (req, res): Promise<void> => {
  const params = AdminUserIdParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const userId = params.data.id;

  const convs = await db
    .select()
    .from(conversationsTable)
    .where(
      or(
        eq(conversationsTable.user1Id, userId),
        eq(conversationsTable.user2Id, userId)
      )
    );

  const result = await Promise.all(
    convs.map(async (conv) => {
      const otherId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
      const [other] = await db.select().from(usersTable).where(eq(usersTable.id, otherId));
      const msgs = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conv.id))
        .limit(1);
      const lastMsg = msgs[0] ?? null;
      return {
        conversationId: conv.id,
        otherUser: other ?? null,
        lastMessage: lastMsg,
        messageCount: (
          await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conv.id))
        ).length,
      };
    })
  );

  res.json(result);
});

router.get("/admin/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.sentAt);

  const withSenders = await Promise.all(
    msgs.map(async (msg) => {
      const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId));
      return { ...msg, sender: sender ?? null };
    })
  );

  res.json(withSenders);
});

export default router;
