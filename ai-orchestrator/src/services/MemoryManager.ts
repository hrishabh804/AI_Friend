import { prisma } from "@/lib/prisma";
import redis from "@/lib/redis";
import { Prisma } from "@prisma/client";

// Define the structure of a message
export interface Message {
  sessionId: string;
  role: "user" | "assistant";
  text: string;
}

// Placeholder for an embedding function
async function getEmbedding(text: string): Promise<number[]> {
  console.log(`Generating embedding for: "${text}"`);
  // In a real implementation, this would call an embedding model (e.g., OpenAI's)
  return Array(1536).fill(0).map(Math.random); // Return a random vector
}

class MemoryManager {
  private readonly shortTermMemoryPrefix = "session:messages:";
  private readonly shortTermMemorySize = 10;

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

    // Save to long-term memory in Postgres
    await prisma.message.create({
      data: {
        sessionId: message.sessionId,
        role: message.role,
        content: message.text,
      },
    });
  }

  // Placeholder for a background worker task
  async summarizeAndEmbed(messages: Message[]): Promise<void> {
    console.log("Summarizing and embedding messages:", messages);
    const summary = messages.map((m) => m.text).join("\n");
    const embedding = await getEmbedding(summary);

    // In a real implementation, you would save this to the "Memory" table
    // with the generated summary and embedding.
    console.log("Generated embedding for summary:", embedding.slice(0, 5));
  }
}

export const memoryManager = new MemoryManager();
