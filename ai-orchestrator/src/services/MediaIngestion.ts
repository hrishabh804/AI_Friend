import { sttService } from "./stt";

class MediaIngestionService {
  /**
   * Signals the start of a new audio stream for a session.
   * This should be called before any audio chunks are sent.
   * @param sessionId The ID of the session.
   */
  start(sessionId: string) {
    console.log(`MediaIngestion: Start for session ${sessionId}`);
    sttService.startTranscription(sessionId);
  }

  /**
   * Handles a single chunk of audio data.
   * @param sessionId The ID of the session.
   * @param audioData The audio data buffer.
   */
  handleAudioChunk(sessionId: string, audioData: Buffer) {
    // Forward the audio chunk to the STT service
    sttService.handleAudioChunk(sessionId, audioData);
  }

  /**
   * Signals the end of an audio stream for a session.
   * This should be called after the last audio chunk has been sent.
   * @param sessionId The ID of the session.
   */
  end(sessionId: string) {
    console.log(`MediaIngestion: End for session ${sessionId}`);
    sttService.endTranscription(sessionId);
  }
}

export const mediaIngestionService = new MediaIngestionService();
