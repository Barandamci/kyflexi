import { Phone, PhoneOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCall } from "@/contexts/call-context";

export default function IncomingCallOverlay() {
  const { incomingCall, callState, acceptCall, rejectCall } = useCall();

  if (callState !== "ringing" || !incomingCall) return null;

  const user = incomingCall.fromUser;
  const name = user?.name ?? `Kullanıcı ${incomingCall.fromUserId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-12 px-4 pointer-events-none">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-primary/20">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/15 text-primary">
                {name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Gelen Arama</p>
            <p className="text-xl font-semibold text-foreground">{name}</p>
          </div>
          <div className="flex gap-8 mt-2">
            <button
              onClick={rejectCall}
              className="w-16 h-16 rounded-full bg-destructive/90 text-white flex items-center justify-center shadow-lg hover:bg-destructive active:scale-95 transition-all"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <button
              onClick={acceptCall}
              className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 active:scale-95 transition-all animate-pulse"
            >
              <Phone className="w-7 h-7" />
            </button>
          </div>
          <div className="flex gap-12 text-xs text-muted-foreground mt-1">
            <span>Reddet</span>
            <span>Cevapla</span>
          </div>
        </div>
      </div>
    </div>
  );
}
