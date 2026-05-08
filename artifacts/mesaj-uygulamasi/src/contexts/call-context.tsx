import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import { useWebSocket, type WsMessage } from "@/hooks/use-websocket";

export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended";

export interface CallUser {
  id: number;
  name: string;
  avatarUrl?: string | null;
}

export interface IncomingCallInfo {
  callId: string;
  fromUserId: number;
  fromUser?: CallUser;
  sdp: string;
}

interface CallContextValue {
  callState: CallState;
  activeCallUser: CallUser | null;
  incomingCall: IncomingCallInfo | null;
  callDuration: number;
  isMuted: boolean;
  isSpeaker: boolean;
  initiateCall: (user: CallUser) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  wsSend: (data: object) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

const STUN_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

const CURRENT_USER_ID = 1;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [activeCallUser, setActiveCallUser] = useState<CallUser | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallDuration(0);
  }

  function cleanup() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    stopTimer();
    callIdRef.current = null;
  }

  const handleWsMessage = useCallback((msg: WsMessage) => {
    switch (msg.type) {
      case "incoming_call": {
        setIncomingCall({
          callId: msg.callId as string,
          fromUserId: msg.fromUserId as number,
          sdp: msg.sdp as string,
        });
        setCallState("ringing");
        break;
      }
      case "call_answered": {
        const setRemoteSdp = async () => {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(
              new RTCSessionDescription({ type: "answer", sdp: msg.sdp as string })
            );
            setCallState("connected");
            startTimer();
          }
        };
        setRemoteSdp();
        break;
      }
      case "call_rejected": {
        cleanup();
        setCallState("ended");
        setActiveCallUser(null);
        setTimeout(() => setCallState("idle"), 2000);
        break;
      }
      case "call_ended": {
        cleanup();
        setCallState("ended");
        setActiveCallUser(null);
        setIncomingCall(null);
        setTimeout(() => setCallState("idle"), 2000);
        break;
      }
      case "ice_candidate": {
        if (pcRef.current && msg.candidate) {
          pcRef.current.addIceCandidate(
            new RTCIceCandidate(msg.candidate as RTCIceCandidateInit)
          ).catch(() => {});
        }
        break;
      }
    }
  }, []);

  const { send: wsSend } = useWebSocket({ userId: CURRENT_USER_ID, onMessage: handleWsMessage });

  const initiateCall = useCallback(async (user: CallUser) => {
    setActiveCallUser(user);
    setCallState("calling");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(STUN_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          wsSend({ type: "ice_candidate", toUserId: user.id, callId: callIdRef.current, candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = e.streams[0];
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      wsSend({ type: "call_offer", toUserId: user.id, sdp: offer.sdp });
    } catch {
      cleanup();
      setCallState("idle");
      setActiveCallUser(null);
    }
  }, [wsSend]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    callIdRef.current = incomingCall.callId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection(STUN_SERVERS);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          wsSend({ type: "ice_candidate", callId: incomingCall.callId, candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = e.streams[0];
      };

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: "offer", sdp: incomingCall.sdp })
      );

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      wsSend({ type: "call_answer", callId: incomingCall.callId, sdp: answer.sdp });

      setActiveCallUser(incomingCall.fromUser ?? { id: incomingCall.fromUserId, name: `Kullanıcı ${incomingCall.fromUserId}` });
      setIncomingCall(null);
      setCallState("connected");
      startTimer();
    } catch {
      cleanup();
      setCallState("idle");
      setIncomingCall(null);
    }
  }, [incomingCall, wsSend]);

  const rejectCall = useCallback(() => {
    if (!incomingCall) return;
    wsSend({ type: "call_reject", callId: incomingCall.callId });
    setIncomingCall(null);
    setCallState("idle");
  }, [incomingCall, wsSend]);

  const endCall = useCallback(() => {
    if (callIdRef.current) {
      wsSend({ type: "call_end", callId: callIdRef.current });
    }
    cleanup();
    setCallState("ended");
    setActiveCallUser(null);
    setIncomingCall(null);
    setTimeout(() => setCallState("idle"), 1500);
  }, [wsSend]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((s) => !s);
  }, []);

  return (
    <CallContext.Provider
      value={{
        callState,
        activeCallUser,
        incomingCall,
        callDuration,
        isMuted,
        isSpeaker,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        wsSend,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}
