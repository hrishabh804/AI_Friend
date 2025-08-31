import { STTAdapter } from "@/adapters/stt/STTAdapter";
import { GoogleSTTAdapter } from "@/adapters/stt/providers/GoogleSTTAdapter";
import { PassThrough } from "stream";

// A simple manager for active STT streams
class ActiveStreamManager {
  private streams: Map<string, PassThrough>;

  constructor() {
    this.streams = new Map();
  }

  // Create a new stream for a session
  create(sessionId: string): PassThrough {
    const stream = new PassThrough();
    this.streams.set(sessionId, stream);
    return stream;
  }

  // Get the stream for a session
  get(sessionId: string): PassThrough | undefined {
    return this.streams.get(sessionId);
  }

  // End and remove the stream for a session
  end(sessionId: string): void {
    const stream = this.streams.get(sessionId);
    if (stream) {
      stream.end();
      this.streams.delete(sessionId);
    }
  }
}

class STTService {
  private sttAdapter: STTAdapter;
  private activeStreams: ActiveStreamManager;

  constructor() {
    this.sttAdapter = new GoogleSTTAdapter();
    this.activeStreams = new ActiveStreamManager();
  }

  // Called when a new utterance begins
  startTranscription(sessionId: string) {
    console.log(`STTService: Starting transcription for session ${sessionId}.`);
    const audioStream = this.activeStreams.create(sessionId);

    // Start consuming the stream with the adapter.
    // This runs in the background and does not block.
    this.sttAdapter.stream(audioStream, sessionId);
  }

  // Processes a chunk of audio data received from the client
  handleAudioChunk(sessionId: string, audioData: Buffer) {
    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      stream.write(audioData);
    } else {
      console.warn(
        `STTService: Received audio chunk for session ${sessionId} but no active stream was found.`
      );
    }
  }

  // Called when the user has finished speaking
  endTranscription(sessionId: string) {
    console.log(`STTService: Ending transcription for session ${sessionId}.`);
    this.activeStreams.end(sessionId);
  }
}

export const sttService = new STTService();
