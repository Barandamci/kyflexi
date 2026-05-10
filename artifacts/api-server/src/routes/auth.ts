import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, usersTable } from "@workspace/db";
import { sendOtpEmail } from "../lib/mailer";

const router: IRouter = Router();

interface OtpEntry {
  code: string;
  expiresAt: number;
  userId: number;
}

const otpStore = new Map<string, OtpEntry>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) otpStore.delete(key);
  }
}

const SendOtpBody = z.object({
  email: z.string().email(),
});

const VerifyOtpBody = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

router.post("/auth/send-otp", async (req, res): Promise<void> => {
  const body = SendOtpBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Geçerli bir e-posta girin" });
    return;
  }

  const email = body.data.email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) {
    res.status(404).json({ error: "Bu e-posta ile kayıtlı kullanıcı bulunamadı" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: `Hesabın askıya alındı: ${user.banReason ?? "Kural ihlali"}` });
    return;
  }

  cleanupExpired();

  const otp = generateOtp();
  otpStore.set(email, {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    userId: user.id,
  });

  try {
    await sendOtpEmail(email, otp);
    req.log.info({ email }, "OTP gönderildi");
    res.json({ message: "Doğrulama kodu e-posta adresinize gönderildi" });
  } catch (err) {
    req.log.error({ err }, "OTP e-posta gönderilemedi");
    res.status(500).json({ error: "E-posta gönderilemedi. Lütfen tekrar deneyin." });
  }
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  const body = VerifyOtpBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Geçersiz istek" });
    return;
  }

  const email = body.data.email.toLowerCase().trim();
  const entry = otpStore.get(email);

  if (!entry) {
    res.status(400).json({ error: "Kod bulunamadı veya süresi doldu. Yeniden gönderin." });
    return;
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email);
    res.status(400).json({ error: "Kodun süresi doldu. Yeniden gönderin." });
    return;
  }

  if (entry.code !== body.data.code) {
    res.status(400).json({ error: "Kod yanlış. Tekrar deneyin." });
    return;
  }

  otpStore.delete(email);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, entry.userId));

  if (!user) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }

  await db
    .update(usersTable)
    .set({ status: "online" })
    .where(eq(usersTable.id, user.id));

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      status: "online",
      tickType: user.tickType,
    },
  });
});

router.get("/auth/me/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "Hesap askıya alındı" }); return; }

  res.json({ id: user.id, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl, status: user.status, tickType: user.tickType });
});

export default router;
