import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { Prisma } from "@prisma/client";

// Define the structure of a message
export interface Message {
  sessionId: string;
  role: "user" | "assistant";
  text: string;
}

import { createHash } from "crypto";

// A more realistic (but still simulated) embedding function.
// It uses a cryptographic hash to generate a deterministic vector from the text.
async function getEmbedding(text: string): Promise<number[]> {
  console.log(`Generating embedding for: "${text.substring(0, 50)}..."`);

  // In a real implementation, this would be an async call to a service like OpenAI.
  // For example:
  // const response = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
  // return response.data[0].embedding;

  const hash = createHash("sha256").update(text).digest();
  const embedding = [];
  for (let i = 0; i < hash.length; i += 2) {
    // Combine two bytes to create a number between -1 and 1
    const value = (hash.readInt16BE(i) / 32768);
    embedding.push(value);
  }

  // Pad the rest of the vector (size 1536)
  const embeddingSize = 1536;
  while (embedding.length < embeddingSize) {
    embedding.push(0);
  }

  return embedding.slice(0, embeddingSize);
}

class MemoryManager {
  private readonly shortTermMemoryPrefix = "session:messages:";
  private readonly shortTermMemorySize = 10;
  private readonly summarizationThreshold = 4; // Number of messages before creating a summary

  // Retrieve the sliding window of recent messages from Redis
  async getShortTermMemory(sessionId: string): Promise<Message[]> {
    const key = `${this.shortTermMemoryPrefix}${sessionId}`;
    const messages = await redis.lrange(key, 0, this.shortTermMemorySize - 1);
    return messages.map((m) => JSON.parse(m)).reverse(); // Return in chronological order
  }

  // Find relevant long-term memories from Postgres using pgvector
  async getLongTermMemories(
    sessionId: string,
    queryText: string
  ): Promise<any[]> {
    const embedding = await getEmbedding(queryText);
    const vector = `[${embedding.join(",")}]`;

    // Use Prisma's $queryRaw to perform a vector similarity search
    const memories = await prisma.$queryRaw`
      SELECT * FROM "Memory"
      WHERE "sessionId" = ${sessionId}
      ORDER BY embedding <=> ${vector}::vector
      LIMIT 5;
    `;
    return memories as any[];
  }

  // Save a message to both short-term (Redis) and long-term (Postgres) memory
  async saveMessage(message: Message): Promise<void> {
    // Save to short-term memory in Redis
    const key = `${this.shortTermMemoryPrefix}${message.sessionId}`;
    await redis.lpush(key, JSON.stringify(message));
    await redis.ltrim(key, 0, this.shortTermMemorySize - 1); // Keep the list trimmed

    // Save the raw message to the database for history
    await prisma.message.create({
      data: {
        sessionId: message.sessionId,
        role: message.role,
        content: message.text,
      },
    });

    // After an assistant's response, trigger the summarization process.
    // This is a simplified approach; in a real system, this would be
    // a more sophisticated background task.
    if (message.role === "assistant") {
      await this.summarizeAndEmbed(message.sessionId);
    }
  }

  // Creates a summary of recent messages and saves it as a long-term memory.
  // In a real system, this would be triggered by a background worker.
  async summarizeAndEmbed(sessionId: string): Promise<void> {
    const messages = await this.getShortTermMemory(sessionId);

    // Don't create a summary if there aren't enough messages
    if (messages.length < this.summarizationThreshold) {
      return;
    }

    console.log(`Creating summary for session ${sessionId}`);
    const summaryText = messages
      .map((m) => `${m.role}: ${m.text}`)
      .join("\n");

    const embedding = await getEmbedding(summaryText);

    // Save the new memory to the database
    await prisma.memory.create({
      data: {
        sessionId: sessionId,
        content: `Summary of recent conversation:\n${summaryText}`,
        embedding: `[${embedding.join(",")}]`,
        source: "summarization",
      },
    });

    // As this is a summary, we can potentially clear the short-term memory
    // to prevent overlap. For now, we'll leave it as a sliding window.
    console.log(`Saved new summary memory for session ${sessionId}.`);
  }
  // ---- Privacy Controls ----

  /**
   * Deletes all data associated with a specific user.
   * This includes sessions, messages, and long-term memories.
   * @param userId The ID of the user to delete.
   */
  async deleteUserData(userId: string): Promise<void> {
    console.log(`Deleting all data for user ${userId}`);

    // 1. Find all sessions for the user
    const sessions = await prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);

    if (sessionIds.length === 0) {
      console.log(`No data found for user ${userId}.`);
      return;
    }

    // 2. Delete data from Redis
    for (const sessionId of sessionIds) {
      const redisKey = `${this.shortTermMemoryPrefix}${sessionId}`;
      await redis.del(redisKey);
    }

    // 3. Delete data from Postgres in a transaction
    await prisma.$transaction([
      prisma.memory.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.message.deleteMany({ where: { sessionId: { in: sessionIds } } }),
      prisma.session.deleteMany({ where: { id: { in: sessionIds } } }),
    ]);

    console.log(`Successfully deleted data for user ${userId}`);
  }

  /**
   * Exports all data for a specific user.
   * @param userId The ID of the user to export data for.
   * @returns An object containing all the user's data.
   */
  async exportUserData(userId: string): Promise<object> {
    console.log(`Exporting all data for user ${userId}`);

    const sessions = await prisma.session.findMany({
      where: { userId },
      include: {
        messages: true, // Include related messages
        memories: true, // Include related long-term memories
      },
    });

    if (sessions.length === 0) {
      return {
        message: "No data found for this user.",
        userId,
        sessions: [],
      };
    }

    return {
      message: "User data export",
      userId,
      sessions,
    };
  }
}

export const memoryManager = new MemoryManager();
