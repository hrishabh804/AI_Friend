import { STTAdapter, STTResponse } from "../STTAdapter";
import { SpeechClient } from "@google-cloud/speech";
import redis from "@/lib/redis";

export class GoogleSTTAdapter implements STTAdapter {
  private speechClient: SpeechClient;
  private redisPublisher: typeof redis;

  constructor() {
    this.speechClient = new SpeechClient();
    this.redisPublisher = redis.duplicate();
  }

  async *stream(audio: AsyncIterable<Buffer>): AsyncIterable<STTResponse> {
    const recognizeStream = this.speechClient
      .streamingRecognize({
        config: {
          encoding: "LINEAR16",
          sampleRateHertz: 16000,
          languageCode: "en-US",
        },
        interimResults: true,
      })
      .on("error", console.error)
      .on("data", (data) => {
        const result = data.results[0];
        if (result && result.alternatives[0]) {
          this.publishEvent({
            type: result.isFinal
              ? "transcript.final"
              : "transcript.partial",
            text: result.alternatives[0].transcript,
          });
        }
      });

    for await (const chunk of audio) {
      recognizeStream.write(chunk);
    }
    recognizeStream.end();

    // This adapter emits events to Redis rather than yielding them directly
    // so this async generator will not yield any values.
  }

  private publishEvent(event: object) {
    // In a real implementation, you would need the session ID to publish
    // to the correct channel. This would need to be passed into the stream method.
    const channel = `session:some-session-id:events`;
    this.redisPublisher.publish(channel, JSON.stringify(event));
  }

  destroy() {
    this.redisPublisher.quit();
  }
}
