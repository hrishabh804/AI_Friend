import { LLMAdapter, LLMConfig, LLMResponse } from "../LLMAdapter";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAILLMAdapter implements LLMAdapter {
  async *stream(
    prompt: string,
    config: LLMConfig
  ): AsyncIterable<LLMResponse> {
    const stream = await openai.chat.completions.create({
      model: "gpt-4", // Or another model specified in config
      messages: [{ role: "user", content: prompt }],
      stream: true,
      ...config,
    });

    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content || "";
      if (content) {
        // In a real implementation, you would parse the content
        // to extract structured data like gesture plans or emotions.
        // For now, we just stream the text.
        yield { text: content };
      }
    }
  }
}
