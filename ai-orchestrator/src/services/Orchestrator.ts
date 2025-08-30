import { LLMAdapter } from "@/adapters/llm/LLMAdapter";
import { OpenAILLMAdapter } from "@/adapters/llm/providers/OpenAILLMAdapter";
import { TTSAdapter } from "@/adapters/tts/TTSAdapter";
import { memoryManager } from "./MemoryManager";
import redis from "@/lib/redis";

class PromptManager {
  composePrompt(shortTermMemory: any[], longTermMemories: any[], userTranscript: string): string {
    // This is a simplified prompt composition
    const memoryContext = [...longTermMemories, ...shortTermMemory]
      .map((mem) => mem.text)
      .join("\n");

    return `
      System: You are a helpful assistant. Here is some context from the conversation history:
      ${memoryContext}
      ---
      User: ${userTranscript}
      Assistant:
    `;
  }
}

export class Orchestrator {
  private sessionId: string;
  private llmAdapter: LLMAdapter;
  private ttsAdapter: TTSAdapter | null = null; // TTS adapter can be set later
  private promptManager: PromptManager;
  private redisPublisher: typeof redis;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.llmAdapter = new OpenAILLMAdapter();
    this.promptManager = new PromptManager();
    this.redisPublisher = redis.duplicate();
  }

  setTTSAdapter(ttsAdapter: TTSAdapter) {
    this.ttsAdapter = ttsAdapter;
  }

  async handleUserTurn(transcript: string) {
    // 1. Retrieve memories
    const shortTermMemory = await memoryManager.getShortTermMemory(this.sessionId);
    const longTermMemories = await memoryManager.getLongTermMemories(this.sessionId, transcript);

    // 2. Compose the prompt
    const prompt = this.promptManager.composePrompt(shortTermMemory, longTermMemories, transcript);

    // 3. Call the LLM adapter
    const llmStream = this.llmAdapter.stream(prompt, {});

    let fullText = "";
    for await (const response of llmStream) {
      if (response.text) {
        fullText += response.text;
        // Publish partial responses or other events as they arrive
        this.publishEvent({ type: "llm.partial", text: response.text });
      }
      if (response.gesture_plan) {
        this.publishEvent({ type: "gesture_plan", plan: response.gesture_plan });
      }
      if (response.emotion) {
        this.publishEvent({ type: "emotion", emotion: response.emotion });
      }
    }

    // 4. Asynchronously send the full text to the TTS adapter
    if (this.ttsAdapter && fullText) {
      this.ttsAdapter.stream(fullText);
      // The TTS adapter will publish speech.chunk events to Redis
    }

    // 5. Save the user message and assistant response to memory
    await memoryManager.saveMessage({
      sessionId: this.sessionId,
      role: "user",
      text: transcript,
    });
    await memoryManager.saveMessage({
      sessionId: this.sessionId,
      role: "assistant",
      text: fullText,
    });
  }

  private publishEvent(event: object) {
    const channel = `session:${this.sessionId}:events`;
    this.redisPublisher.publish(channel, JSON.stringify(event));
  }

  destroy() {
    this.redisPublisher.quit();
  }
}
