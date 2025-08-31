import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { generateWebSocketToken } from "@/lib/utils/jwt";

// Define a type for the session state stored in Redis
interface SessionState {
  persona: object;
  capabilities: object;
  messageQueue: string[];
  status: "active" | "terminated";
}

class SessionManager {
  private readonly sessionStatePrefix = "session:state:";
  private readonly messageQueueSize = 10; // Keep the last 10 messages

  // Method to create a new session
  async createSession(userId: string) {
    // Create a session in the database
    const session = await prisma.session.create({
      data: {
        userId,
        status: "active",
      },
    });

    // Initialize the session state in Redis
    const sessionState: SessionState = {
      persona: {
        name: "Assistant",
        style: "friendly",
      },
      capabilities: {
        stt: true,
        tts: true,
        llm: true,
      },
      messageQueue: [],
      status: "active",
    };
    await redis.set(
      `${this.sessionStatePrefix}${session.id}`,
      JSON.stringify(sessionState)
    );

    // Generate a short-lived WebSocket token
    const wsToken = generateWebSocketToken(session.id, userId);

    return {
      sessionId: session.id,
      wsToken,
    };
  }

  // Method to get the state of a session
  async getSessionState(sessionId: string) {
    const state = await redis.get(`${this.sessionStatePrefix}${sessionId}`);
    return state ? JSON.parse(state) : null;
  }

  // Method to update the session state
  async updateSessionState(sessionId: string, newState: Partial<SessionState>) {
    const currentState = await this.getSessionState(sessionId);
    if (currentState) {
      const updatedState = { ...currentState, ...newState };
      await redis.set(
        `${this.sessionStatePrefix}${sessionId}`,
        JSON.stringify(updatedState)
      );
      return updatedState;
    }
    return null;
  }

  // Method to terminate a session
  async terminateSession(sessionId: string) {
    // Update the status in the database
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "terminated" },
    });

    // Update the status in Redis
    const currentState = await this.getSessionState(sessionId);
    if (currentState) {
      currentState.status = "terminated";
      await redis.set(
        `${this.sessionStatePrefix}${sessionId}`,
        JSON.stringify(currentState)
      );
    }
  }

  // Method to add a message to the session's queue
  async addMessageToQueue(sessionId: string, message: string) {
    const key = `${this.sessionStatePrefix}${sessionId}`;
    const currentState = await this.getSessionState(sessionId);
    if (currentState) {
      // Add message and trim the list
      currentState.messageQueue.push(message);
      if (currentState.messageQueue.length > this.messageQueueSize) {
        currentState.messageQueue.shift(); // Remove the oldest message
      }
      await redis.set(key, JSON.stringify(currentState));
    }
  }
}

export const sessionManager = new SessionManager();
