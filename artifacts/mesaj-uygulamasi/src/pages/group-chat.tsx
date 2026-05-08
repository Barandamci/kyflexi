import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, Users } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useCall } from "@/contexts/call-context";
import type { WsMessage } from "@/hooks/use-websocket";

const CURRENT_USER_ID = 1;

interface GroupMember {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  status: string;
}

interface GroupMessage {
  id: number;
  groupId: number;
  senderId: number;
  content: string;
  sentAt: string;
  sender: GroupMember;
}

interface GroupDetail {
  id: number;
  name: string;
  avatarUrl: string | null;
  members: GroupMember[];
}

export default function GroupChat() {
  const { id } = useParams<{ id: string }>();
  const groupId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { wsSend } = useCall();

  const { data: group, isLoading: groupLoading } = useQuery<GroupDetail>({
    queryKey: ["group", groupId],
    queryFn: () => fetch(`/api/groups/${groupId}`).then((r) => r.json()),
    enabled: !!groupId,
  });

  const { data: messages, isLoading: msgsLoading } = useQuery<GroupMessage[]>({
    queryKey: ["group-messages", groupId],
    queryFn: () => fetch(`/api/groups/${groupId}/messages`).then((r) => r.json()),
    enabled: !!groupId,
    refetchInterval: 1000,
  });

  const sendMsg = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: CURRENT_USER_ID, content }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups", CURRENT_USER_ID] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
  });

  useEffect(() => {
    const handler = (msg: WsMessage) => {
      if (msg.type === "new_group_message" && msg.groupId === groupId) {
        queryClient.invalidateQueries({ queryKey: ["group-messages", groupId] });
        queryClient.invalidateQueries({ queryKey: ["groups", CURRENT_USER_ID] });
      }
    };
    return () => {};
  }, [groupId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    sendMsg.mutate(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <header className="px-3 py-3 sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border flex items-center gap-3">
        <button
          onClick={() => setLocation("/groups")}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {groupLoading ? (
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <Avatar className="w-10 h-10">
              <AvatarImage src={group?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-sm font-semibold bg-primary/15 text-primary">
                {group?.name?.charAt(0) ?? "G"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{group?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight flex items-center gap-1">
                <Users className="w-3 h-3" />
                {group?.members.length ?? 0} üye
              </p>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {msgsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-40" : "w-52"}`} />
              </div>
            ))}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16">
            <Users className="w-10 h-10 opacity-30 mb-3" />
            <p className="text-sm font-medium">Henüz mesaj yok</p>
            <p className="text-xs mt-1">İlk mesajı sen gönder!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine = msg.senderId === CURRENT_USER_ID;
              const showDate =
                i === 0 ||
                new Date(msg.sentAt).toDateString() !== new Date(messages[i - 1].sentAt).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-3">
                      <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        {format(new Date(msg.sentAt), "d MMMM yyyy", { locale: tr })}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {!isMine && (
                      <Avatar className="w-7 h-7 mb-1 flex-shrink-0">
                        <AvatarImage src={msg.sender?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-muted">
                          {msg.sender?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card text-card-foreground border border-border rounded-bl-sm"
                      }`}
                    >
                      {!isMine && (
                        <p className="text-[10px] font-semibold text-primary mb-0.5">
                          {msg.sender?.name}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {format(new Date(msg.sentAt), "HH:mm")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </main>

      <div className="px-3 py-3 border-t border-border bg-card/80 backdrop-blur-md">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gruba mesaj yaz..."
            rows={1}
            className="flex-1 resize-none bg-muted/60 border border-border rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32 leading-relaxed transition-colors"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMsg.isPending}
            className="w-11 h-11 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
