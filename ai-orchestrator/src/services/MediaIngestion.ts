class MediaIngestionService {
  handleAudioChunk(sessionId: string, audioData: Buffer) {
    // In a real implementation, this would forward the audio to the STT adapter
    console.log(
      `Received audio chunk for session ${sessionId}, size: ${audioData.length}`
    );
  }
}

export const mediaIngestionService = new MediaIngestionService();
