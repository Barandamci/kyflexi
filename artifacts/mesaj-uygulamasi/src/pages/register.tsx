import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { User, AtSign, Mail, Lock, ArrowRight, RotateCcw, ShieldCheck, Eye, EyeOff } from "lucide-react";

type Step = "form" | "otp";

export default function RegisterPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const [step, setStep] = useState<Step>("form");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !email.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Kayıt başarısız"); return; }
      setRegisteredEmail(email.trim().toLowerCase());
      setSuccess(data.message);
      setStep("otp");
    } catch {
      setError("Bağlantı hatası. Tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail, code: otp }),
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

  async function resendOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: registeredEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Gönderilemedi"); return; }
      setSuccess("Kod yeniden gönderildi");
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background items-center justify-center px-6 animate-in fade-in duration-300 overflow-y-auto py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Braw" className="w-16 h-16 rounded-2xl object-cover mb-3 shadow-xl" />
          <h1 className="text-2xl font-bold tracking-tight">Hesap Oluştur</h1>
          <p className="text-muted-foreground text-sm mt-1">Braw'a katıl</p>
        </div>

        {step === "form" ? (
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Ad Soyad */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Ad Soyad
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Adın ve Soyadın"
                  autoComplete="name"
                  required
                  minLength={2}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Kullanıcı Adı */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                  placeholder="kullanici_adi"
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={30}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 ml-1">Sadece harf, rakam ve _ kullanılabilir</p>
            </div>

            {/* E-posta */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@gmail.com"
                  autoComplete="email"
                  required
                  className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>

            {/* Şifre */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 6 karakter"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !name.trim() || !username.trim() || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-all active:scale-[0.98] mt-1"
            >
              {loading ? "Kayıt yapılıyor..." : <><ArrowRight className="w-4 h-4" /> Kayıt Ol</>}
            </button>

            <p className="text-center text-sm text-muted-foreground pt-1">
              Zaten hesabın var mı?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Giriş Yap
              </Link>
            </p>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Registered email banner */}
            <div className="bg-muted/40 border border-border rounded-xl px-4 py-3">
              <p className="text-xs text-muted-foreground">Kod gönderildi:</p>
              <p className="text-sm font-medium">{registeredEmail}</p>
            </div>

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                  6 Haneli Doğrulama Kodu
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
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
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
                {loading ? "Doğrulanıyor..." : <><ShieldCheck className="w-4 h-4" /> Doğrula ve Giriş Yap</>}
              </button>
            </form>

            <button
              onClick={resendOtp}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted/40 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Kodu Yeniden Gönder
            </button>

            <button
              onClick={() => { setStep("form"); setOtp(""); setError(""); setSuccess(""); }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              ← Geri dön
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
