import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/api/ws" });
const PORT = 3003;

console.log("⚡ Initializing WebSocket Server Module...");

wss.on("connection", (ws: WebSocket) => {
  console.log("🤝 New Client established socket link connection.");

  // Broadcast welcome message to just this specific socket client connection channel
  ws.send(
    JSON.stringify({
      user: "System",
      text: "Connected to real-time chat room stream hub.",
    }),
  );

  // Listen to incoming messages transmitted down from any individual browser engine client
  ws.on("message", (rawData) => {
    try {
      const parsed = JSON.parse(rawData.toString());
      console.log(
        `📩 Received text execution: [${parsed.user}]: ${parsed.text}`,
      );

      // Broadcast the incoming message out to EVERY connected active peer socket client link pipeline
      const outboundPayload = JSON.stringify({
        user: parsed.user,
        text: parsed.text,
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(outboundPayload);
        }
      });
    } catch (err) {
      console.error(
        "Failed to parse incoming socket frame buffer message content data packet:",
        err,
      );
    }
  });

  ws.on("close", () => {
    console.log(
      "❌ Client disconnected from the socket interface pipeline channel.",
    );
  });
});

server.listen(PORT, () => {
  console.log(`🚀 WebSocket service listening at http://localhost:${PORT}`);
});
