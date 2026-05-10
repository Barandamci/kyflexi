import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
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

function safeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    status: user.status,
    tickType: user.tickType,
    isEmailVerified: user.isEmailVerified,
  };
}

const RegisterBody = z.object({
  name: z.string().min(2).max(60),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "Sadece harf, rakam ve _ kullanılabilir"),
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const VerifyOtpBody = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const ResendOtpBody = z.object({
  email: z.string().email(),
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const body = RegisterBody.safeParse(req.body);
  if (!body.success) {
    const msg = body.error.errors[0]?.message ?? "Geçersiz bilgiler";
    res.status(400).json({ error: msg });
    return;
  }

  const { name, username, email, password } = body.data;
  const emailLower = email.toLowerCase().trim();
  const usernameLower = username.toLowerCase().trim();

  const existing = await db
    .select()
    .from(usersTable)
    .where(or(eq(usersTable.email, emailLower), eq(usersTable.username, usernameLower)));

  if (existing.length > 0) {
    const conflict = existing[0];
    if (conflict.email === emailLower) {
      res.status(409).json({ error: "Bu e-posta adresi zaten kullanılıyor" });
    } else {
      res.status(409).json({ error: "Bu kullanıcı adı zaten alınmış" });
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      username: usernameLower,
      email: emailLower,
      passwordHash,
      isEmailVerified: false,
      status: "offline",
    })
    .returning();

  cleanupExpired();
  const otp = generateOtp();
  otpStore.set(emailLower, {
    code: otp,
    expiresAt: Date.now() + 10 * 60 * 1000,
    userId: user.id,
  });

  try {
    await sendOtpEmail(emailLower, otp);
  } catch (err) {
    req.log.error({ err }, "OTP gönderilemedi (register)");
  }

  res.status(201).json({ message: "Hesap oluşturuldu. Doğrulama kodu e-postanıza gönderildi.", email: emailLower });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const body = LoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "E-posta ve şifre girin" });
    return;
  }

  const emailLower = body.data.email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, emailLower));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "E-posta veya şifre yanlış" });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: `Hesabın askıya alındı: ${user.banReason ?? "Kural ihlali"}` });
    return;
  }

  const match = await bcrypt.compare(body.data.password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "E-posta veya şifre yanlış" });
    return;
  }

  await db.update(usersTable).set({ status: "online" }).where(eq(usersTable.id, user.id));

  res.json({ user: { ...safeUser(user), status: "online" } });
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
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
    .update(usersTable)
    .set({ isEmailVerified: true, status: "online" })
    .where(eq(usersTable.id, entry.userId))
    .returning();

  if (!user) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }

  res.json({ user: { ...safeUser(user), status: "online" } });
});

router.post("/auth/resend-otp", async (req, res): Promise<void> => {
  const body = ResendOtpBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Geçerli e-posta girin" });
    return;
  }

  const email = body.data.email.toLowerCase().trim();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(404).json({ error: "Kullanıcı bulunamadı" });
    return;
  }

  cleanupExpired();
  const otp = generateOtp();
  otpStore.set(email, { code: otp, expiresAt: Date.now() + 10 * 60 * 1000, userId: user.id });

  try {
    await sendOtpEmail(email, otp);
    res.json({ message: "Doğrulama kodu yeniden gönderildi" });
  } catch {
    res.status(500).json({ error: "E-posta gönderilemedi. Tekrar deneyin." });
  }
});

router.get("/auth/me/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Geçersiz ID" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
  if (user.isBanned) { res.status(403).json({ error: "Hesap askıya alındı" }); return; }

  res.json(safeUser(user));
});

export default router;
