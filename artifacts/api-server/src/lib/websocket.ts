import { WebSocket, WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import type { Server } from "node:http";

export const wsClients = new Map<number, WebSocket>();
export const activeCalls = new Map<string, { callerId: number; calleeId: number }>();

export function broadcastToUser(userId: number, data: object): void {
  const ws = wsClients.get(userId);
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function broadcastToUsers(userIds: number[], data: object): void {
  for (const userId of userIds) {
    broadcastToUser(userId, data);
  }
}

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  wss.on("connection", (ws: WebSocket) => {
    let userId: number | null = null;

    ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;

        switch (msg.type) {
          case "identify": {
            userId = Number(msg.userId);
            wsClients.set(userId, ws);
            break;
          }
          case "call_offer": {
            if (!userId) break;
            const callId = randomUUID();
            const toUserId = Number(msg.toUserId);
            activeCalls.set(callId, { callerId: userId, calleeId: toUserId });
            const targetWs = wsClients.get(toUserId);
            if (targetWs?.readyState === WebSocket.OPEN) {
              targetWs.send(JSON.stringify({
                type: "incoming_call",
                callId,
                fromUserId: userId,
                sdp: msg.sdp,
              }));
            } else {
              ws.send(JSON.stringify({ type: "call_rejected", callId, reason: "offline" }));
              activeCalls.delete(callId);
            }
            break;
          }
          case "call_answer": {
            if (!userId) break;
            const call = activeCalls.get(msg.callId as string);
            if (!call) break;
            const callerWs = wsClients.get(call.callerId);
            if (callerWs?.readyState === WebSocket.OPEN) {
              callerWs.send(JSON.stringify({
                type: "call_answered",
                callId: msg.callId,
                sdp: msg.sdp,
              }));
            }
            break;
          }
          case "call_reject": {
            if (!userId) break;
            const call = activeCalls.get(msg.callId as string);
            if (!call) break;
            const callerWs = wsClients.get(call.callerId);
            if (callerWs?.readyState === WebSocket.OPEN) {
              callerWs.send(JSON.stringify({
                type: "call_rejected",
                callId: msg.callId,
              }));
            }
            activeCalls.delete(msg.callId as string);
            break;
          }
          case "call_end": {
            const call = activeCalls.get(msg.callId as string);
            if (!call) break;
            const otherUserId = userId === call.callerId ? call.calleeId : call.callerId;
            const otherWs = wsClients.get(otherUserId);
            if (otherWs?.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: "call_ended",
                callId: msg.callId,
              }));
            }
            activeCalls.delete(msg.callId as string);
            break;
          }
          case "ice_candidate": {
            if (!userId) break;
            const call = activeCalls.get(msg.callId as string);
            if (!call) break;
            const otherUserId = userId === call.callerId ? call.calleeId : call.callerId;
            const otherWs = wsClients.get(otherUserId);
            if (otherWs?.readyState === WebSocket.OPEN) {
              otherWs.send(JSON.stringify({
                type: "ice_candidate",
                callId: msg.callId,
                candidate: msg.candidate,
              }));
            }
            break;
          }
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on("close", () => {
      if (userId !== null) wsClients.delete(userId);
    });
  });

  return wss;
}
