import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Mail, ArrowRight, RotateCcw, ShieldCheck } from "lucide-react";

type Step = "email" | "otp";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Hata oluştu"); return; }
      setSuccess(data.message);
      setStep("otp");
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kod yanlış"); return; }
      login(data.user);
      setLocation("/");
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background items-center justify-center px-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-10">
          <img src="/logo.png" alt="Braw" className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-xl" />
          <h1 className="text-3xl font-bold tracking-tight">Braw</h1>
          <p className="text-muted-foreground text-sm mt-1">Türkiye'nin mesajlaşma uygulaması</p>
        </div>

        {step === "email" ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                E-posta Adresi
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@gmail.com"
                  autoFocus
                  required
                  className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              {loading ? "Gönderiliyor..." : (
                <>Kod Gönder <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              E-posta adresinize 6 haneli bir doğrulama kodu göndereceğiz.
            </p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <div className="bg-muted/40 border border-border rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Kod gönderildi:</p>
                <p className="text-sm font-medium">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(""); setSuccess(""); }}
                className="text-primary text-xs hover:underline"
              >
                Değiştir
              </button>
            </div>

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                6 Haneli Kod
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              {loading ? "Doğrulanıyor..." : (
                <>Giriş Yap <ShieldCheck className="w-4 h-4" /></>
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={sendOtp as any}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/40 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Kodu Yeniden Gönder
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
