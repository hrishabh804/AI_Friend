export interface LLMConfig {
  [key: string]: any; // Placeholder for provider-specific config
}

export interface LLMResponse {
  text?: string;
  gesture_plan?: object;
  emotion?: string;
  // ... other structured data
}

export interface LLMAdapter {
  stream(prompt: string, config: LLMConfig): AsyncIterable<LLMResponse>;
}
