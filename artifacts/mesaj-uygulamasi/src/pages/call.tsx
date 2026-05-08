import { useEffect } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCall } from "@/contexts/call-context";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function CallScreen() {
  const { callState, activeCallUser, callDuration, isMuted, isSpeaker, endCall, toggleMute, toggleSpeaker } = useCall();

  const user = activeCallUser;

  if (callState === "idle" || callState === "ringing") return null;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-between py-16 px-6">
      <div className="flex flex-col items-center gap-5 mt-8">
        <div className="relative">
          <Avatar className="w-32 h-32 border-4 border-primary/20">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name} />
            <AvatarFallback className="text-4xl font-bold bg-primary/15 text-primary">
              {user?.name?.charAt(0) ?? "?"}
            </AvatarFallback>
          </Avatar>
          {callState === "connected" && (
            <div className="absolute inset-0 rounded-full border-4 border-green-400/30 animate-ping" />
          )}
          {callState === "calling" && (
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
          )}
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">{user?.name ?? "Bilinmeyen"}</h2>
          {callState === "calling" && (
            <p className="text-muted-foreground text-sm animate-pulse">Aranıyor...</p>
          )}
          {callState === "connected" && (
            <p className="text-green-400 text-sm font-medium tabular-nums">
              {formatDuration(callDuration)}
            </p>
          )}
          {callState === "ended" && (
            <p className="text-muted-foreground text-sm">Arama sonlandı</p>
          )}
        </div>
      </div>

      {callState !== "ended" && (
        <div className="flex flex-col items-center gap-8 w-full">
          {callState === "connected" && (
            <div className="flex gap-6">
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isMuted
                    ? "bg-destructive/20 text-destructive border border-destructive/30"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <button
                onClick={toggleSpeaker}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  !isSpeaker
                    ? "bg-muted/50 text-muted-foreground"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                {isSpeaker ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
              </button>
            </div>
          )}

          <button
            onClick={endCall}
            className="w-20 h-20 rounded-full bg-destructive text-white flex items-center justify-center shadow-xl hover:bg-destructive/90 active:scale-95 transition-all"
          >
            <PhoneOff className="w-8 h-8" />
          </button>
          <p className="text-xs text-muted-foreground">
            {callState === "calling" ? "İptal" : "Kapat"}
          </p>
        </div>
      )}
    </div>
  );
}
