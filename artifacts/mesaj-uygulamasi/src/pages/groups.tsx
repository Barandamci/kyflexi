import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Users, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useListUsers } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";

interface GroupSummary {
  id: number;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  members: Array<{ id: number; name: string; avatarUrl: string | null; status: string }>;
  lastMessage: { id: number; content: string; senderId: number; sentAt: string } | null;
}

export default function GroupsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const CURRENT_USER_ID = authUser?.id ?? 0;
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  const { data: groups, isLoading, refetch } = useQuery<GroupSummary[]>({
    queryKey: ["groups", CURRENT_USER_ID],
    queryFn: () =>
      fetch(`/api/groups?userId=${CURRENT_USER_ID}`).then((r) => r.json()),
    refetchInterval: 1000,
  });

  const { data: users } = useListUsers({
    query: { queryKey: ["users"] },
  });

  const otherUsers = users?.filter((u) => u.id !== CURRENT_USER_ID) ?? [];

  async function createGroup() {
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    setCreating(true);
    try {
      await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: [CURRENT_USER_ID, ...selectedUserIds],
        }),
      });
      setGroupName("");
      setSelectedUserIds([]);
      setShowCreate(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["groups", CURRENT_USER_ID] });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background animate-in fade-in duration-300">
      <header className="px-3 py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Gruplar</h1>
          <p className="text-xs text-muted-foreground">Grup sohbetleri</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {showCreate && (
        <div className="border-b border-border bg-card/90 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sm">Yeni Grup Oluştur</h2>
            <button onClick={() => setShowCreate(false)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Grup adı..."
            className="w-full bg-muted/60 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Üye ekle:</p>
            <div className="flex flex-wrap gap-2">
              {otherUsers.map((u) => {
                const selected = selectedUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() =>
                      setSelectedUserIds((prev) =>
                        selected ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                      )
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {u.name.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={createGroup}
            disabled={creating || !groupName.trim() || selectedUserIds.length === 0}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-all"
          >
            {creating ? "Oluşturuluyor..." : "Grup Oluştur"}
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : !groups || groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 opacity-40" />
            </div>
            <p className="font-medium text-sm mb-1">Henüz grup yok</p>
            <p className="text-xs">Yeni bir grup oluşturmak için + butonuna tıkla.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/group/${group.id}`}
                className="flex items-center p-4 hover:bg-muted/30 transition-colors duration-200"
              >
                <Avatar className="w-14 h-14 border border-background flex-shrink-0">
                  <AvatarImage src={group.avatarUrl ?? undefined} alt={group.name} />
                  <AvatarFallback className="bg-primary/15 text-primary font-bold text-lg">
                    {group.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-4 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-0.5">
                    <h2 className="font-medium text-foreground truncate">{group.name}</h2>
                    {group.lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(group.lastMessage.sentAt), "HH:mm")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.members.length} üye
                    {group.lastMessage ? ` · ${group.lastMessage.content}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
