import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER ?? "",
    pass: process.env.GMAIL_APP_PASSWORD ?? "",
  },
});

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `"Braw" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Braw — Giriş Doğrulama Kodunuz",
    html: `
      <div style="font-family:Inter,sans-serif;max-width:420px;margin:0 auto;background:#0f0f11;color:#fff;border-radius:16px;padding:32px;border:1px solid #2a2a35">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <img src="https://i.imgur.com/placeholder.png" width="36" height="36" style="border-radius:8px" alt="Braw"/>
          <span style="font-size:22px;font-weight:700;color:#fff">Braw</span>
        </div>
        <h2 style="font-size:18px;font-weight:600;margin:0 0 8px">Doğrulama Kodunuz</h2>
        <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Braw'a giriş yapmak için aşağıdaki kodu kullan. Kod 10 dakika geçerlidir.</p>
        <div style="background:#1a1a2e;border:1px solid #3730a3;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#818cf8">${otp}</span>
        </div>
        <p style="color:#6b7280;font-size:12px;margin:0">Bu kodu kimseyle paylaşma. Braw ekibi hiçbir zaman kodunu istemez.</p>
      </div>
    `,
  });
}
