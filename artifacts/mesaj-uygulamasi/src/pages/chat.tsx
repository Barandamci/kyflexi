import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetConversation,
  getGetConversationQueryKey,
  useListMessages,
  getListMessagesQueryKey,
  useSendMessage,
  useMarkConversationRead,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Send, Phone } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useCall } from "@/contexts/call-context";
import { useAuth } from "@/contexts/auth-context";

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const convId = parseInt(id ?? "0", 10);
  const [, setLocation] = useLocation();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { initiateCall, callState } = useCall();
  const { user: authUser } = useAuth();
  const CURRENT_USER_ID = authUser?.id ?? 0;

  const { data: conversation, isLoading: convLoading } = useGetConversation(convId, {
    query: {
      enabled: !!convId,
      queryKey: getGetConversationQueryKey(convId),
      refetchInterval: 5000,
    },
  });

  const { data: messages, isLoading: msgsLoading } = useListMessages(convId, {
    query: {
      enabled: !!convId,
      queryKey: getListMessagesQueryKey(convId),
      refetchInterval: 1000,
    },
  });

  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  const otherUser =
    conversation?.user1.id === CURRENT_USER_ID ? conversation?.user2 : conversation?.user1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (convId) {
      markRead.mutate(
        { id: convId, data: { userId: CURRENT_USER_ID } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: getListConversationsQueryKey({ userId: CURRENT_USER_ID }),
            });
          },
        }
      );
    }
  }, [convId]);

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    sendMessage.mutate(
      { id: convId, data: { senderId: CURRENT_USER_ID, content: trimmed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(convId) });
          queryClient.invalidateQueries({
            queryKey: getListConversationsQueryKey({ userId: CURRENT_USER_ID }),
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleCall() {
    if (!otherUser) return;
    initiateCall({ id: otherUser.id, name: otherUser.name, avatarUrl: otherUser.avatarUrl });
  }

  const statusColor =
    otherUser?.status === "online"
      ? "bg-green-500"
      : otherUser?.status === "away"
        ? "bg-yellow-400"
        : "bg-muted-foreground/40";

  const statusLabel =
    otherUser?.status === "online"
      ? "Çevrimiçi"
      : otherUser?.status === "away"
        ? "Uzakta"
        : "Çevrimdışı";

  const isInCall = callState !== "idle";

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <header className="px-3 py-3 sticky top-0 z-10 bg-card/90 backdrop-blur-md border-b border-border flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {convLoading ? (
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarImage src={otherUser?.avatarUrl ?? undefined} alt={otherUser?.name} />
                <AvatarFallback className="text-sm font-semibold bg-primary/15 text-primary">
                  {otherUser?.name?.charAt(0) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${statusColor}`} />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{otherUser?.name}</p>
              <p className="text-xs text-muted-foreground leading-tight">{statusLabel}</p>
            </div>
          </div>
        )}

        {otherUser && (
          <button
            onClick={handleCall}
            disabled={isInCall}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            title="Sesli Arama"
          >
            <Phone className="w-5 h-5" />
          </button>
        )}
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {msgsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                <Skeleton className={`h-10 rounded-2xl ${i % 2 === 0 ? "w-40" : "w-52"}`} />
              </div>
            ))}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
              <Send className="w-6 h-6 opacity-40" />
            </div>
            <p className="text-sm font-medium">Henüz mesaj yok</p>
            <p className="text-xs mt-1">Merhaba demekle başla!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine = msg.senderId === CURRENT_USER_ID;
              const showDate =
                i === 0 ||
                new Date(msg.sentAt).toDateString() !==
                  new Date(messages[i - 1].sentAt).toDateString();

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
                        <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
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
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      <p
                        className={`text-[10px] mt-1 text-right ${
                          isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                        }`}
                      >
                        {format(new Date(msg.sentAt), "HH:mm")}
                        {isMine && (
                          <span className="ml-1">{msg.isRead ? "✓✓" : "✓"}</span>
                        )}
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
            placeholder="Mesaj yaz..."
            rows={1}
            className="flex-1 resize-none bg-muted/60 border border-border rounded-2xl px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-32 leading-relaxed transition-colors"
            style={{ minHeight: "44px" }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sendMessage.isPending}
            className="w-11 h-11 flex-shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
