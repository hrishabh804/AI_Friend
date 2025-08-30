import { NextRequest, NextResponse } from "next/server";
import { WebSocketServer } from "ws";
import { verifyWebSocketToken } from "@/lib/utils/jwt";
import redis from "@/lib/redis";
import {
  incomingMessageSchema,
  audioChunkHeaderSchema,
} from "@/lib/types/schemas";
import { mediaIngestionService } from "@/services/MediaIngestion";

// Define a map to hold WebSocket servers, one for each path
const wsServers = new Map<string, WebSocketServer>();

// Function to get or create a WebSocket server for a given path
function getWebSocketServer(path: string): WebSocketServer {
  if (!wsServers.has(path)) {
    const wss = new WebSocketServer({ noServer: true });
    wsServers.set(path, wss);
    console.log(`WebSocket server created for path: ${path}`);

    wss.on("connection", (ws) => {
      console.log("Client connected");
      let sessionId: string | null = null;
      let redisSubscriber: typeof redis | null = null;

      ws.on("message", async (message: Buffer) => {
        // The first part of the message is a JSON header, the rest is binary data
        const headerSize = message.readUInt32BE(0);
        const headerStr = message.slice(4, 4 + headerSize).toString("utf-8");
        const binaryData = message.slice(4 + headerSize);

        try {
          const header = JSON.parse(headerStr);

          if (!sessionId) {
            // The first message must be an auth message
            if (header.type === "auth" && typeof header.token === "string") {
              const payload = verifyWebSocketToken(header.token);
              if (payload) {
                sessionId = payload.sessionId;
                console.log(`Authenticated session: ${sessionId}`);

                // Subscribe to the Redis Pub/Sub channel for this session
                redisSubscriber = redis.duplicate();
                const channel = `session:${sessionId}:events`;
                await redisSubscriber.subscribe(channel);

                redisSubscriber.on("message", (ch, msg) => {
                  if (ch === channel) {
                    ws.send(msg); // Forward message to the client
                  }
                });

                ws.send(JSON.stringify({ type: "auth.success" }));
              } else {
                ws.close(1008, "Invalid token");
              }
            } else {
              ws.close(1002, "Authentication required");
            }
            return;
          }

          // Validate subsequent messages using Zod
          const parsedHeader = incomingMessageSchema.safeParse(header);
          if (!parsedHeader.success) {
            console.warn("Invalid message received:", parsedHeader.error);
            return;
          }

          // Handle different message types
          switch (parsedHeader.data.type) {
            case "audio.chunk":
              mediaIngestionService.handleAudioChunk(sessionId, binaryData);
              break;
            case "control.end_turn":
              // Here you would trigger the orchestrator to process the turn
              console.log(`Received end_turn for session ${sessionId}`);
              break;
          }
        } catch (error) {
          console.error("Failed to process message:", error);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected");
        if (redisSubscriber) {
          redisSubscriber.quit();
        }
      });
    });
  }
  return wsServers.get(path)!;
}

export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const wss = getWebSocketServer(pathname);

  // Upgrade the connection
  // @ts-ignore
  const res = new NextResponse(null, { status: 101 });
  // @ts-ignore
  const socket = req.socket;
  const head = Buffer.alloc(0);

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });

  return res;
}
