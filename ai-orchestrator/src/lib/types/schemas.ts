import { z } from "zod";

// Schema for the initial authentication message
export const authMessageSchema = z.object({
  type: z.literal("auth"),
  token: z.string(),
});

// Schema for the audio chunk header
export const audioChunkHeaderSchema = z.object({
  type: z.literal("audio.chunk"),
  sequence: z.number(),
  timestamp: z.number(),
});

// Schema for the control message to end a turn
export const endTurnMessageSchema = z.object({
  type: z.literal("control.end_turn"),
});

// A union of all possible incoming message schemas
export const incomingMessageSchema = z.union([
  authMessageSchema,
  audioChunkHeaderSchema,
  endTurnMessageSchema,
]);

// Example schemas for outgoing messages (from server to client)
export const partialTranscriptSchema = z.object({
  type: z.literal("transcript.partial"),
  text: z.string(),
});

export const finalTranscriptSchema = z.object({
  type: z.literal("transcript.final"),
  text: z.string(),
});

export const speechChunkSchema = z.object({
    type: z.literal("speech.chunk"),
    audio_base64: z.string(),
    visemes: z.any(), // simplified for now
    timing_info: z.any(), // simplified for now
});

export const outgoingMessageSchema = z.union([
    partialTranscriptSchema,
    finalTranscriptSchema,
    speechChunkSchema,
]);
