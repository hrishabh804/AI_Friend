export interface STTResponse {
  transcript: string;
  isFinal: boolean;
}

export interface STTAdapter {
  stream(audio: AsyncIterable<Buffer>): AsyncIterable<STTResponse>;
}
