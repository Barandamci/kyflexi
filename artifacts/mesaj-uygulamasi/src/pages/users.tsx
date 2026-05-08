import { useLocation } from "wouter";
import { useListUsers, getListUsersQueryKey, useCreateConversation, getListConversationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageCircle, Users } from "lucide-react";

const CURRENT_USER_ID = 1;

export default function UsersPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey() },
  });

  const createConv = useCreateConversation();

  function handleStartChat(userId: number) {
    if (userId === CURRENT_USER_ID) return;
    createConv.mutate(
      { data: { user1Id: CURRENT_USER_ID, user2Id: userId } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({
            queryKey: getListConversationsQueryKey({ userId: CURRENT_USER_ID }),
          });
          setLocation(`/chat/${conv.id}`);
        },
      }
    );
  }

  const otherUsers = users?.filter((u) => u.id !== CURRENT_USER_ID) ?? [];

  const statusColor = (status: string) =>
    status === "online"
      ? "bg-green-500"
      : status === "away"
        ? "bg-yellow-400"
        : "bg-muted-foreground/40";

  const statusLabel = (status: string) =>
    status === "online" ? "Çevrimiçi" : status === "away" ? "Uzakta" : "Çevrimdışı";

  return (
    <div className="flex flex-col h-[100dvh] bg-background animate-in fade-in duration-300">
      {/* Header */}
      <header className="px-3 py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Kişiler</h1>
          <p className="text-xs text-muted-foreground">Sohbet baslatmak icin biri sec</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Users className="w-4 h-4 text-primary" />
        </div>
      </header>

      {/* User List */}
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : otherUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center text-muted-foreground px-8">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users className="w-7 h-7 opacity-40" />
            </div>
            <p className="font-medium text-sm">Kullanici bulunamadi</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {otherUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => handleStartChat(user.id)}
                disabled={createConv.isPending}
                className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors duration-150 text-left disabled:opacity-60"
                data-testid={`button-start-chat-${user.id}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                    <AvatarFallback className="text-sm font-semibold bg-primary/15 text-primary">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${statusColor(user.status)}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate" data-testid={`text-user-name-${user.id}`}>
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{user.username} &middot; {statusLabel(user.status)}
                  </p>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MessageCircle className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
