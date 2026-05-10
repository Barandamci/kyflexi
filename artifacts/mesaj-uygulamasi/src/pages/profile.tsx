import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, Check, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpload } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

const STATUS_OPTIONS = [
  { value: "online", label: "Çevrimiçi", color: "bg-green-500" },
  { value: "away", label: "Uzakta", color: "bg-yellow-400" },
  { value: "offline", label: "Çevrimdışı", color: "bg-muted-foreground/40" },
] as const;

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const CURRENT_USER_ID = user?.id ?? 0;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localName, setLocalName] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<string | null>(null);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  const isLoading = !user;

  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: async (response) => {
      const avatarUrl = `/api/storage${response.objectPath}`;
      setLocalAvatar(avatarUrl);
      await saveUser({ avatarUrl });
    },
  });

  const displayName = localName ?? user?.name ?? "";
  const displayStatus = localStatus ?? user?.status ?? "online";
  const displayAvatar = localAvatar ?? user?.avatarUrl ?? null;

  async function saveUser(overrides?: { avatarUrl?: string }) {
    setSaving(true);
    try {
      await fetch(`/api/users/${CURRENT_USER_ID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: localName ?? user?.name,
          status: localStatus ?? user?.status,
          avatarUrl: overrides?.avatarUrl ?? localAvatar ?? user?.avatarUrl,
        }),
      });
      queryClient.invalidateQueries();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <header className="px-3 py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1">Profilim</h1>
        <button
          onClick={() => { logout(); setLocation("/login"); }}
          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          title="Çıkış Yap"
        >
          <LogOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => saveUser()}
          disabled={saving || isUploading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-all"
        >
          {saved ? <Check className="w-4 h-4" /> : null}
          {saving ? "Kaydediliyor..." : saved ? "Kaydedildi" : "Kaydet"}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-primary/20">
                  <AvatarImage src={displayAvatar ?? undefined} alt={displayName} />
                  <AvatarFallback className="text-3xl font-bold bg-primary/15 text-primary">
                    {displayName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-all disabled:opacity-60"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {isUploading && (
                <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ad Soyad
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-full bg-muted/60 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
                  placeholder="Adınız"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Kullanıcı Adı
                </label>
                <div className="w-full bg-muted/30 border border-border/50 rounded-xl px-4 py-3 text-sm text-muted-foreground">
                  @{user?.username}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Durum
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLocalStatus(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        displayStatus === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
