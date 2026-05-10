import React, { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useListConversations, getListConversationsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCirclePlus, Users, Shield, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import * as Tabs from "@radix-ui/react-tabs";
import { useAuth } from "@/contexts/auth-context";

interface GroupSummary {
  id: number;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  members: Array<{ id: number; name: string; avatarUrl: string | null; status: string }>;
  lastMessage: { id: number; content: string; senderId: number; sentAt: string } | null;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const CURRENT_USER_ID = currentUser?.id ?? 0;

  const { data: conversations, isLoading: convsLoading } = useListConversations(
    { userId: CURRENT_USER_ID },
    {
      query: {
        queryKey: getListConversationsQueryKey({ userId: CURRENT_USER_ID }),
        refetchInterval: 1000,
        enabled: !!CURRENT_USER_ID,
      },
    }
  );

  const { data: groups, isLoading: groupsLoading } = useQuery<GroupSummary[]>({
    queryKey: ["groups", CURRENT_USER_ID],
    queryFn: () => fetch(`/api/groups?userId=${CURRENT_USER_ID}`).then((r) => r.json()),
    refetchInterval: 1000,
    enabled: !!CURRENT_USER_ID,
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-background animate-in fade-in duration-300">
      <header className="px-4 pt-4 pb-0 sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/profile")} className="relative">
              <Avatar className="w-9 h-9 border-2 border-primary/20">
                <AvatarImage src={currentUser?.avatarUrl ?? undefined} alt={currentUser?.name} />
                <AvatarFallback className="text-xs font-bold bg-primary/15 text-primary">
                  {currentUser?.name?.charAt(0) ?? "A"}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${
                  currentUser?.status === "online"
                    ? "bg-green-500"
                    : currentUser?.status === "away"
                      ? "bg-yellow-400"
                      : "bg-muted-foreground/40"
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Braw" className="w-7 h-7 rounded-lg object-cover" />
              <h1 className="text-xl font-bold tracking-tight">Braw</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              title="Admin Paneli"
            >
              <Shield className="w-5 h-5" />
            </Link>
            <Link
              href="/groups"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            >
              <Users className="w-5 h-5" />
            </Link>
            <Link
              href="/users"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <MessageCirclePlus className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <Tabs.Root defaultValue="chats">
          <Tabs.List className="flex gap-0 border-b-0">
            <Tabs.Trigger
              value="chats"
              className="flex-1 pb-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
            >
              Sohbetler
            </Tabs.Trigger>
            <Tabs.Trigger
              value="groups"
              className="flex-1 pb-3 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary transition-colors"
            >
              Gruplar
              {groups && groups.length > 0 && (
                <span className="ml-1.5 bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {groups.length}
                </span>
              )}
            </Tabs.Trigger>
          </Tabs.List>

          <div className="flex-1 overflow-hidden">
            <Tabs.Content value="chats" className="outline-none">
              <ConversationsList conversations={conversations} isLoading={convsLoading} />
            </Tabs.Content>
            <Tabs.Content value="groups" className="outline-none">
              <GroupsList groups={groups} isLoading={groupsLoading} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </header>
    </div>
  );
}

function ConversationsList({
  conversations,
  isLoading,
}: {
  conversations: ReturnType<typeof useListConversations>["data"];
  isLoading: boolean;
}) {
  return (
    <div className="overflow-y-auto" style={{ height: "calc(100dvh - 130px)" }}>
      {isLoading ? (
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground pt-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <MessageCirclePlus className="w-8 h-8 opacity-40" />
          </div>
          <p className="text-sm font-medium mb-1">Henüz sohbet yok</p>
          <p className="text-xs">Yeni bir sohbet başlatmak için + butonuna tıkla.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="flex items-center p-4 hover:bg-muted/30 transition-colors duration-200"
            >
              <div className="relative">
                <Avatar className="w-14 h-14 border border-background">
                  <AvatarImage src={conv.otherUser.avatarUrl ?? undefined} alt={conv.otherUser.name} />
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {conv.otherUser.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                    conv.otherUser.status === "online"
                      ? "bg-green-500"
                      : conv.otherUser.status === "away"
                        ? "bg-yellow-400"
                        : "bg-muted-foreground/30"
                  }`}
                />
              </div>
              <div className="ml-4 flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-medium text-foreground truncate">{conv.otherUser.name}</h2>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {format(new Date(conv.lastMessage.sentAt), "HH:mm")}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm truncate ${
                      conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {conv.lastMessage ? (
                      <>
                        {conv.lastMessage.senderId === CURRENT_USER_ID && (
                          <span className="text-primary/70 mr-1">Sen:</span>
                        )}
                        {conv.lastMessage.content}
                      </>
                    ) : (
                      <span className="italic">Sohbet başlatıldı</span>
                    )}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupsList({
  groups,
  isLoading,
}: {
  groups: GroupSummary[] | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="overflow-y-auto" style={{ height: "calc(100dvh - 130px)" }}>
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
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground pt-16">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 opacity-40" />
          </div>
          <p className="text-sm font-medium mb-1">Henüz grup yok</p>
          <Link href="/groups" className="text-xs text-primary mt-1">
            Yeni grup oluştur →
          </Link>
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
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
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
                <p className="text-sm text-muted-foreground truncate">
                  {group.members.length} üye
                  {group.lastMessage ? ` · ${group.lastMessage.content}` : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
