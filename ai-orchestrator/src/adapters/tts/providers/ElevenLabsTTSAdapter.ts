import { TTSAdapter, TTSResponse } from "../TTSAdapter";
import { phonemeVisemeService } from "@/services/PhonemeVisemeService";
import redis from "@/lib/redis";
import { ElevenLabsClient } from "elevenlabs";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export class ElevenLabsTTSAdapter implements TTSAdapter {
  private redisPublisher: typeof redis;

  constructor() {
    this.redisPublisher = redis.duplicate();
  }

  async *stream(text: string): AsyncIterable<TTSResponse> {
    // 1. Get phonemes for the text
    const phonemes = await phonemeVisemeService.getPhonemesForText(text);
    const visemes = phonemeVisemeService.normalizePhonemesToVisemes(phonemes);

    // 2. Stream audio from ElevenLabs
    const audioStream = await elevenlabs.generate({
      voice: "Rachel",
      text,
      model_id: "eleven_multilingual_v2",
      stream: true,
    });

    // In a real implementation, we would need to align the streamed audio
    // with the phoneme/viseme timings. This is a complex task.
    // For now, we'll just send all the visemes with the first chunk of audio.

    let visemesSent = false;
    for await (const chunk of audioStream) {
      const response: TTSResponse = {
        audio_base64: chunk.toString("base64"),
        visemes: visemesSent ? [] : visemes, // Send visemes only once
        timing_info: {}, // Placeholder
      };
      visemesSent = true;

      // Yield the response and also publish it to Redis
      this.publishEvent(response);
      yield response;
    }
  }

  private publishEvent(event: TTSResponse) {
    // In a real implementation, you would need the session ID to publish
    // to the correct channel.
    const channel = `session:some-session-id:events`;
    this.redisPublisher.publish(
      channel,
      JSON.stringify({ type: "speech.chunk", ...event })
    );
  }

  destroy() {
    this.redisPublisher.quit();
  }
}
