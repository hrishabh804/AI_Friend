export interface Phoneme {
  phoneme: string;
  start: number;
  end: number;
}

export interface Viseme {
  viseme: string;
  start: number;
  end: number;
}

export interface TTSResponse {
  audio_base64: string;
  visemes: Viseme[];
  phonemes?: Phoneme[];
  timing_info: any;
}

export interface TTSAdapter {
  stream(text: string): AsyncIterable<TTSResponse>;
}
