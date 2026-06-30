import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 3004 });
const clients = new Set<WebSocket>();

wss.on("connection", (ws) => {
  clients.add(ws);

  ws.on("message", (message) => {
    clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  ws.on("close", () => clients.delete(ws));
});

console.log("🚀 WebRTC Signaling Server running on port 3004");
