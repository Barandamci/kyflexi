import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Shield,
  CheckCircle2,
  Ban,
  MessageSquare,
  ChevronRight,
  X,
  Send,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const OWNER_EMAIL = "barandamci@icloud.com";

interface AdminUser {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  status: string;
  tickType: "blue" | "black" | "orange" | null;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
}

interface ConvSummary {
  conversationId: number;
  otherUser: AdminUser | null;
  lastMessage: { id: number; content: string; sentAt: string; senderId: number } | null;
  messageCount: number;
}

interface Message {
  id: number;
  content: string;
  sentAt: string;
  senderId: number;
  sender: AdminUser | null;
}

function TickBadge({ type }: { type: "blue" | "black" | "orange" | null }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    blue: "text-blue-400",
    black: "text-zinc-200",
    orange: "text-orange-400",
  };
  return (
    <CheckCircle2
      className={`w-4 h-4 inline-block ml-1 flex-shrink-0 ${colors[type]}`}
      fill="currentColor"
    />
  );
}

function StatusDot({ status }: { status: string }) {
  const c = status === "online" ? "bg-green-500" : status === "away" ? "bg-yellow-400" : "bg-zinc-500";
  return <span className={`inline-block w-2 h-2 rounded-full ${c}`} />;
}

export default function AdminPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [view, setView] = useState<"users" | "convs" | "chat">("users");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedConv, setSelectedConv] = useState<ConvSummary | null>(null);

  const [banDialog, setBanDialog] = useState<AdminUser | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banLoading, setBanLoading] = useState(false);

  const [tickLoading, setTickLoading] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/admin/users").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const { data: convs, isLoading: convsLoading } = useQuery<ConvSummary[]>({
    queryKey: ["admin-convs", selectedUser?.id],
    queryFn: () =>
      fetch(`/api/admin/users/${selectedUser!.id}/conversations`).then((r) => r.json()),
    enabled: !!selectedUser && view === "convs",
    refetchInterval: 3000,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["admin-msgs", selectedConv?.conversationId],
    queryFn: () =>
      fetch(`/api/admin/conversations/${selectedConv!.conversationId}/messages`).then((r) =>
        r.json()
      ),
    enabled: !!selectedConv && view === "chat",
    refetchInterval: 2000,
  });

  async function setTick(user: AdminUser, tick: "blue" | "black" | "orange" | null) {
    setTickLoading(user.id);
    try {
      if (tick === null) {
        await fetch(`/api/admin/users/${user.id}/tick`, { method: "DELETE" });
      } else {
        await fetch(`/api/admin/users/${user.id}/tick`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickType: tick }),
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } finally {
      setTickLoading(null);
    }
  }

  async function banUser() {
    if (!banDialog || !banReason.trim()) return;
    setBanLoading(true);
    try {
      await fetch(`/api/admin/users/${banDialog.id}/ban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: banReason.trim() }),
      });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setBanDialog(null);
      setBanReason("");
    } finally {
      setBanLoading(false);
    }
  }

  async function unbanUser(user: AdminUser) {
    await fetch(`/api/admin/users/${user.id}/ban`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  function openConvs(user: AdminUser) {
    setSelectedUser(user);
    setView("convs");
  }

  function openChat(conv: ConvSummary) {
    setSelectedConv(conv);
    setView("chat");
  }

  function goBack() {
    if (view === "chat") { setView("convs"); setSelectedConv(null); }
    else if (view === "convs") { setView("users"); setSelectedUser(null); }
    else setLocation("/");
  }

  const TICKS: Array<{ type: "blue" | "black" | "orange"; label: string; color: string }> = [
    { type: "blue", label: "Mavi Tık", color: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
    { type: "black", label: "Siyah Tık", color: "text-zinc-200 border-zinc-500/40 bg-zinc-500/10" },
    { type: "orange", label: "Turuncu Tık", color: "text-orange-400 border-orange-400/40 bg-orange-400/10" },
  ];

  return (
    <div className="flex flex-col h-[100dvh] bg-background animate-in fade-in duration-200">
      <header className="px-3 py-4 sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border flex items-center gap-3">
        <button onClick={goBack} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold leading-tight">
              {view === "users" ? "Admin Paneli" : view === "convs" ? `${selectedUser?.name} — Konuşmalar` : `${selectedUser?.name} ↔ ${selectedConv?.otherUser?.name ?? "?"}`}
            </h1>
            {view === "users" && (
              <p className="text-[11px] text-muted-foreground">{OWNER_EMAIL}</p>
            )}
          </div>
        </div>
      </header>

      {/* BAN DIALOG */}
      {banDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-semibold">Kullanıcıyı Banla</h2>
              </div>
              <button onClick={() => { setBanDialog(null); setBanReason(""); }}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              <span className="font-medium text-foreground">{banDialog.name}</span> kullanıcısını
              banlıyorsunuz. Lütfen bir açıklama girin:
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Ban sebebi..."
              rows={3}
              className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/40 resize-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setBanDialog(null); setBanReason(""); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
              >
                İptal
              </button>
              <button
                onClick={banUser}
                disabled={banLoading || !banReason.trim()}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50 hover:bg-destructive/90 transition-colors"
              >
                {banLoading ? "Banlanıyor..." : "Banla"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {/* USERS LIST */}
        {view === "users" && (
          <div>
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
            ) : (
              <div className="divide-y divide-border/40">
                {(users ?? []).map((user) => (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-12 h-12 border border-border">
                          <AvatarImage src={user.avatarUrl ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0">
                          <StatusDot status={user.status} />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm truncate">{user.name}</span>
                          <TickBadge type={user.tickType} />
                        </div>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                        {user.isBanned && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-destructive font-medium mt-0.5">
                            <Ban className="w-3 h-3" /> Banlı — {user.banReason}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => openConvs(user)}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                        title="Mesajları Gör"
                      >
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    {/* TIK BUTONLARI */}
                    <div className="flex flex-wrap gap-1.5 ml-15">
                      {TICKS.map(({ type, label, color }) => (
                        <button
                          key={type}
                          disabled={tickLoading === user.id}
                          onClick={() => setTick(user, user.tickType === type ? null : type)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                            user.tickType === type
                              ? color + " opacity-100"
                              : "border-border text-muted-foreground hover:bg-muted opacity-70"
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {label}
                        </button>
                      ))}
                      {/* BAN / UNBAN */}
                      {user.isBanned ? (
                        <button
                          onClick={() => unbanUser(user)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                        >
                          <Ban className="w-3 h-3" /> Banı Kaldır
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBanDialog(user); setBanReason(""); }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
                        >
                          <Ban className="w-3 h-3" /> Banla
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONVERSATIONS LIST */}
        {view === "convs" && (
          <div>
            {convsLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
            ) : !convs || convs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Bu kullanıcının hiç konuşması yok.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {convs.map((conv) => (
                  <button
                    key={conv.conversationId}
                    onClick={() => openChat(conv)}
                    className="w-full flex items-center p-4 hover:bg-muted/30 transition-colors text-left"
                  >
                    <Avatar className="w-12 h-12 border border-border flex-shrink-0">
                      <AvatarImage src={conv.otherUser?.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {conv.otherUser?.name.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="ml-3 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm">{conv.otherUser?.name ?? "Bilinmiyor"}</span>
                        <TickBadge type={conv.otherUser?.tickType ?? null} />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.messageCount} mesaj
                        {conv.lastMessage ? ` · ${conv.lastMessage.content}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT VIEW (read-only) */}
        {view === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {msgsLoading ? (
                <div className="text-center text-muted-foreground text-sm py-8">Yükleniyor...</div>
              ) : !messages || messages.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Henüz mesaj yok.
                </div>
              ) : (
                (() => {
                  let lastDate = "";
                  return messages.map((msg) => {
                    const isMine = msg.senderId === selectedUser?.id;
                    const dateStr = format(new Date(msg.sentAt), "d MMMM yyyy", { locale: tr });
                    const showDate = dateStr !== lastDate;
                    lastDate = dateStr;
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="flex justify-center my-3">
                            <span className="text-[11px] bg-muted/60 text-muted-foreground px-3 py-1 rounded-full">
                              {dateStr}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} items-end gap-2`}>
                          {!isMine && (
                            <Avatar className="w-7 h-7 flex-shrink-0">
                              <AvatarImage src={msg.sender?.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-[10px] bg-muted">
                                {msg.sender?.name.charAt(0) ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                            {!isMine && (
                              <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">
                                {msg.sender?.name}
                              </span>
                            )}
                            <div
                              className={`px-3.5 py-2.5 rounded-2xl text-sm ${
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted text-foreground rounded-bl-sm"
                              }`}
                            >
                              {msg.content}
                              <div className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {format(new Date(msg.sentAt), "HH:mm")}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>
            {/* Read-only banner */}
            <div className="border-t border-border px-4 py-3 bg-muted/30 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5 flex-shrink-0" />
              Admin görüntüleme modu — sadece okuma
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
