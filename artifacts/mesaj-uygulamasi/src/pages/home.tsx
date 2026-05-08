import React from "react";
import { Link } from "wouter";
import { useListConversations, getListConversationsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MessageCirclePlus, Search } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const CURRENT_USER_ID = 1;

export default function Home() {
  const { data: conversations, isLoading } = useListConversations({ userId: CURRENT_USER_ID }, {
    query: {
      queryKey: getListConversationsQueryKey({ userId: CURRENT_USER_ID })
    }
  });

  return (
    <div className="flex flex-col h-full bg-background animate-in fade-in duration-300">
      <header className="px-4 py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Sohbetler</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-search">
            <Search className="w-5 h-5" />
          </Button>
          <Link href="/users" className="inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 w-9" data-testid="link-new-chat">
            <MessageCirclePlus className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageCirclePlus className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-lg font-medium mb-1">Henüz mesaj yok</p>
            <p className="text-sm">Arkadaşlarınla sohbet etmeye başlamak için yeni bir konuşma başlat.</p>
            <Link href="/users" className="mt-6 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2" data-testid="button-empty-new-chat">
              Konuşma Başlat
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {conversations.map((conv) => (
              <Link 
                key={conv.id} 
                href={`/chat/${conv.id}`}
                className="flex items-center p-4 hover:bg-muted/30 transition-colors duration-200"
                data-testid={`link-conversation-${conv.id}`}
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-background">
                    <AvatarImage src={conv.otherUser.avatarUrl || undefined} alt={conv.otherUser.name} />
                    <AvatarFallback>{conv.otherUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {conv.otherUser.status === 'online' && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></span>
                  )}
                </div>
                
                <div className="ml-4 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-medium text-foreground truncate">{conv.otherUser.name}</h2>
                    {conv.lastMessage && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {format(new Date(conv.lastMessage.sentAt), 'HH:mm')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.lastMessage ? (
                        <>
                          {conv.lastMessage.senderId === CURRENT_USER_ID && <span className="text-primary/70 mr-1">Sen:</span>}
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
      </main>
    </div>
  );
}
