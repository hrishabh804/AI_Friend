Session Management / Orchestration



Create, validate and terminate sessions.

Maintain session state in Redis (short-term) and Postgres (longer-term metadata).

Issue short-lived WS/RTC tokens (JWT with session scope).

At session creation: set persona/avatar/voice defaults and client capability flags.

Authentication & Authorization



OAuth2/OpenID Connect sign-in (or JWT). Provide /api/auth/* endpoints.

Issue short-lived tokens for WS and STT/TTS/LLM calls; support role checks for admin endpoints.

Real-time Control Channel (WebSocket)



Implement control WS for transcripts, events, gesture plans, phoneme metadata, and orchestrator commands.

Validate incoming messages; handle audio.chunk headers, vad events, control.end_turn, etc.

Backpressure handling & binary support for audio.

Media Ingestion Orchestration



Accept audio either via:

WebRTC media (recommended): coordinate STUN/TURN and SFU (external). Next.js orchestrator instructs SFU to forward a copy to STT/TTS endpoints and ties stream → session.

WebSocket streaming (fallback): accept binary Opus/PCM chunks over WS.

Buffer and reassemble audio frames, associate with utterance_id.

STT Adapter



Stream audio to provider (Whisper/Google) or to local model adapter.

Emit transcript.partial and transcript.final events to WS clients.

Implement interface to support provider failover and n-best alternatives.

LLM Adapter & Prompt Manager



Compose system prompt (persona + memory + sliding window).

Send streaming requests to LLM and parse tokens/structured outputs.

Enforce response format (JSON with text, gesture_plan, emotion, actions), and fallback parsing.

Rate-limit and token-budget governance per session.

TTS Adapter & Phoneme/Visme Service



Send LLM text to TTS provider requesting streaming audio + phoneme timestamps if supported.

If provider lacks phoneme timing, run phoneme alignment service (forced-align or ML).

Provide chunked speech.chunk messages (audio_base64 + phonemes + gesture events) to WS.

Avatar / Animation Triggering



Translate structured gesture_plan → animation events.

Normalize phonemes → visemes per avatar and send mapping metadata to client.

Memory Manager



Short-term (Redis): sliding window of recent messages.

Long-term (Postgres + vector DB/pgvector): store, summarize, embed and retrieve memories.

Memory pruning, summarization, and privacy controls (user delete/export).

Safety / Moderation



Pre-send filter: sanitize LLM output before TTS (disallowed categories -> safe fallback).

Post-filter telemetry: log flagged content for human review.

Admin endpoints to manage policies and whitelist/blacklist.

Adapters Abstraction



Provide clean, typed adapter interfaces (STTAdapter, LLMAdapter, TTSAdapter, VisemeService).

Implement provider switching and fallbacks at runtime.

Observability, Logging & Tracing



Correlate traces across STT→LLM→TTS with trace_id (OpenTelemetry).

Emit metrics: latencies, packet loss, error rates.

Structured logs (JSON) with session_id, response_id, user_id (or anonymized).

Scaling & Resilience



Keep orchestrator stateless — use Redis and Postgres for shared state.

Horizontal scale orchestrator nodes behind load balancer; state stored externally.

Use worker pools for async tasks (phoneme alignment, memory summarization).

Admin & Debug Endpoints



Persona tuning UI endpoints, session replay, conversation export, moderation queue.



