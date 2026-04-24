"""
agent.py — Automaton AI Infosystem Voice Agent
================================================
Self-hosted inbound + outbound phone agent using LiveKit Agents.

Tech stack:
  STT  : Groq Whisper (whisper-large-v3) via OpenAI-compatible endpoint
  LLM  : Groq llama-3.3-70b-versatile via OpenAI-compatible endpoint
  TTS  : Sarvam AI REST API (custom LiveKit TTS plugin, chunked streaming)
  VAD  : Silero
  SIP  : Twilio (inbound + outbound via LiveKit SIP)
  DB   : Airtable (call_logs + orders tables)

Run locally:
  python agent.py dev
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import uuid
from datetime import datetime, timezone

import aiohttp
from dotenv import load_dotenv

# LiveKit Agents core
from livekit import api as lk_api, rtc
from livekit.agents import (
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli,
)
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.voice.turn import (
    EndpointingOptions,
    InterruptionOptions,
    TurnHandlingOptions,
)
from livekit.agents.tts import TTS, TTSCapabilities, ChunkedStream
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from livekit.agents.utils import shortuuid

# LiveKit plugins
from livekit.plugins import openai as lk_openai   # Groq STT + LLM via OAI-compat
from livekit.plugins import silero                 # VAD

# ──────────────────────────────────────────────────────────────────────────────
# 1. ENVIRONMENT & CONFIGURATION
# ──────────────────────────────────────────────────────────────────────────────
load_dotenv()  # Reads from .env in current directory

# LiveKit
LIVEKIT_URL        = os.environ["LIVEKIT_URL"]
LIVEKIT_API_KEY    = os.environ["LIVEKIT_API_KEY"]
LIVEKIT_API_SECRET = os.environ["LIVEKIT_API_SECRET"]
LIVEKIT_SIP_TRUNK  = os.environ["LIVEKIT_SIP_TRUNK_ID"]

# Groq — one API key handles both Whisper STT and LLaMA LLM
GROQ_API_KEY  = os.environ["GROQ_API_KEY"]
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Sarvam AI TTS
SARVAM_API_KEY = os.environ["SARVAM_API_KEY"]
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

# Twilio
TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN  = os.environ["TWILIO_AUTH_TOKEN"]
TWILIO_PHONE       = os.environ["TWILIO_PHONE_NUMBER"]

# Airtable
AIRTABLE_PAT     = os.environ["AIRTABLE_PAT"]
AIRTABLE_BASE_ID = os.environ["AIRTABLE_BASE_ID"]
AIRTABLE_API_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}"

# Agent behaviour
MAX_CALL_DURATION = int(os.getenv("MAX_CALL_DURATION_SECONDS", "300"))
DEFAULT_PROMPT = (
    "You are a polite and efficient order acceptance agent for Automaton AI Infosystem. "
    "Your job is to accept customer orders over a phone call. "
    "Always respond in the same language the customer is speaking. "
    "Follow this exact flow: "
    "1) Greet the customer warmly and ask for their name. "
    "2) Ask what they would like to order. "
    "3) Confirm the quantity. "
    "4) Ask for their delivery address. "
    "5) Read back the full order details and ask for confirmation. "
    "6) Thank them and close the call. "
    "Keep all responses short and conversational since this is a voice call. "
    "Do not discuss anything unrelated to placing an order."
)
SYSTEM_PROMPT = os.getenv("AGENT_SYSTEM_PROMPT", DEFAULT_PROMPT)

logger = logging.getLogger("voice-agent")

# ──────────────────────────────────────────────────────────────────────────────
# 2. LANGUAGE → SARVAM VOICE CODE MAPPING
#
#    To add a new language:
#      - Add an entry below using the 2-letter ISO 639-1 code (e.g. "ta" for Tamil)
#      - Use the Sarvam BCP-47 locale as value (e.g. "ta-IN")
#    The key must match what Groq Whisper returns as detected_language (lowercased).
# ──────────────────────────────────────────────────────────────────────────────
LANGUAGE_VOICE_MAP: dict[str, str] = {
    "hi": "hi-IN",   # Hindi
    "kn": "kn-IN",   # Kannada
    "mr": "mr-IN",   # Marathi
    "en": "en-IN",   # English (Indian accent)
}
DEFAULT_VOICE = "en-IN"  # Fallback before language is detected


# ──────────────────────────────────────────────────────────────────────────────
# 3. AIRTABLE HELPERS
#    All DB writes are fire-and-forget wrapped in try/except so a database
#    failure can NEVER crash an ongoing call.
# ──────────────────────────────────────────────────────────────────────────────

async def _airtable_post(table: str, fields: dict) -> None:
    """HTTP POST a single record to an Airtable table."""
    url = f"{AIRTABLE_API_URL}/{table}"
    headers = {
        "Authorization": f"Bearer {AIRTABLE_PAT}",
        "Content-Type":  "application/json",
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, json={"fields": fields}) as resp:
            if resp.status not in (200, 201):
                body = await resp.text()
                raise RuntimeError(f"Airtable {table} write failed {resp.status}: {body}")
    logger.info("Airtable '%s' record created successfully.", table)


async def log_call_to_airtable(
    *,
    call_id: str,
    caller_number: str,
    duration_seconds: float,
    transcript: str,
    language_detected: str,
) -> None:
    """Write a completed call summary to the call_logs table."""
    try:
        await _airtable_post("call_logs", {
            "call_id":           call_id,
            "caller_number":     caller_number,
            "duration_seconds":  round(duration_seconds),
            "transcript":        transcript,
            "language_detected": language_detected,
            "created_at":        datetime.now(timezone.utc).isoformat(),
        })
    except Exception as exc:
        logger.error("Failed to write call_logs to Airtable: %s", exc)


async def extract_and_log_order(*, call_id: str, transcript: str) -> None:
    """
    Send the call transcript to Groq LLaMA to extract structured order data,
    then write the extracted fields to the orders table in Airtable.

    The LLM is prompted to return ONLY a JSON object — no surrounding prose.
    If extraction fails, we log the error without crashing anything.
    """
    try:
        from openai import AsyncOpenAI

        groq = AsyncOpenAI(api_key=GROQ_API_KEY, base_url=GROQ_BASE_URL)

        extraction_prompt = (
            "Extract order information from this phone call transcript. "
            "Return ONLY a valid JSON object with these exact keys:\n"
            "  customer_name (string), item_ordered (string), "
            "quantity (integer), delivery_address (string).\n"
            "If any field cannot be determined, use an empty string (or 0 for quantity).\n\n"
            f"TRANSCRIPT:\n{transcript}"
        )

        response = await groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": extraction_prompt}],
            temperature=0,  # Deterministic — we want consistent extraction
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown code fences if the LLM wrapped the JSON
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw

        order = json.loads(raw)

        await _airtable_post("orders", {
            "call_id":          call_id,
            "customer_name":    order.get("customer_name", ""),
            "item_ordered":     order.get("item_ordered", ""),
            "quantity":         int(order.get("quantity", 0)),
            "delivery_address": order.get("delivery_address", ""),
            "order_status":     "confirmed",
            "created_at":       datetime.now(timezone.utc).isoformat(),
        })

    except Exception as exc:
        logger.error("Failed to extract/log order to Airtable: %s", exc)


# ──────────────────────────────────────────────────────────────────────────────
# 4. SARVAM AI CUSTOM TTS PLUGIN
#
#    LiveKit does not have a built-in Sarvam plugin, so we implement one by
#    subclassing livekit.agents.tts.TTS and ChunkedStream.
#
#    Sarvam returns base64-encoded WAV audio (22050 Hz, mono) in a single REST
#    response. After decoding, we strip the 44-byte WAV header and deliver the
#    raw PCM to LiveKit via AudioEmitter so playback starts immediately.
# ──────────────────────────────────────────────────────────────────────────────

class SarvamTTS(TTS):
    """
    Custom TTS plugin for Sarvam AI multilingual Indian voices.

    Usage:
        tts = SarvamTTS(api_key="...", voice="en-IN")
        tts.update_voice("hi-IN")   # dynamically switch after language detection
    """

    SAMPLE_RATE  = 22050   # Sarvam returns 22050 Hz WAV
    NUM_CHANNELS = 1       # Mono

    def __init__(self, *, api_key: str, voice: str = "en-IN") -> None:
        super().__init__(
            capabilities=TTSCapabilities(streaming=False, aligned_transcript=False),
            sample_rate=self.SAMPLE_RATE,
            num_channels=self.NUM_CHANNELS,
        )
        self._api_key = api_key
        self._voice   = voice   # BCP-47 locale, e.g. "hi-IN"

    def update_voice(self, voice_code: str) -> None:
        """
        Dynamically switch the TTS voice.
        Call this as soon as Groq Whisper has detected the caller's language.
        """
        logger.info("Sarvam TTS: switching voice to '%s'", voice_code)
        self._voice = voice_code

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "SarvamChunkedStream":
        return SarvamChunkedStream(
            tts=self,
            input_text=text,
            conn_options=conn_options,
        )


class SarvamChunkedStream(ChunkedStream):
    """
    Fetches one TTS response from Sarvam, decodes it, and pushes the raw PCM
    bytes to LiveKit via AudioEmitter. LiveKit starts playing as soon as the
    first (and in this case only) chunk arrives.
    """

    async def _run(self, output_emitter) -> None:  # type: ignore[override]
        tts: SarvamTTS = self._tts  # type: ignore[assignment]

        payload = {
            "inputs":               [self._input_text],
            "target_language_code": tts._voice,
            "speaker":              "anushka",    # Use 'anushka' (available in bulbul:v2)
            "model":                "bulbul:v2",
            "enable_preprocessing": True,
        }
        headers = {
            "api-subscription-key": tts._api_key,
            "Content-Type":         "application/json",
        }

        # Initialize the emitter with Sarvam's audio properties
        output_emitter.initialize(
            request_id   = shortuuid(),
            sample_rate  = tts.sample_rate,
            num_channels = tts.num_channels,
            mime_type    = "audio/pcm",
            stream       = False,
        )

        async with aiohttp.ClientSession() as session:
            async with session.post(SARVAM_TTS_URL, headers=headers, json=payload) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error("Sarvam TTS error %d: %s", resp.status, body)
                    return
                data = await resp.json()
                logger.debug("Sarvam TTS raw response: %s", data)

        if not data.get("audios"):
            logger.error("Sarvam TTS returned no audios field")
            return

        # Sarvam returns a list of base64-encoded WAV audios
        audio_bytes = base64.b64decode(data["audios"][0])
        logger.debug("Decoded audio length: %d bytes", len(audio_bytes))

        if len(audio_bytes) < 45:
            logger.error("Sarvam TTS returned an empty or too-short audio file")
            return

        pcm_bytes   = audio_bytes[44:] # Strip WAV header

        # Push to LiveKit (SDK handles end_input and join automatically)
        output_emitter.push(pcm_bytes)
        output_emitter.flush()


# ──────────────────────────────────────────────────────────────────────────────
# 5. GROQ STT — Whisper via OpenAI-compatible endpoint
#    language=None tells Whisper to auto-detect the caller's language.
# ──────────────────────────────────────────────────────────────────────────────

def build_groq_stt() -> lk_openai.STT:
    return lk_openai.STT(
        model    = "whisper-large-v3",
        language = "",          # Auto-detect via empty string (None causes crash in 1.5.6)
        api_key  = GROQ_API_KEY,
        base_url = GROQ_BASE_URL,
    )


# ──────────────────────────────────────────────────────────────────────────────
# 6. GROQ LLM — llama-3.3-70b via OpenAI-compatible endpoint
#    Streaming is enabled by default in lk_openai.LLM so tokens flow to TTS
#    immediately without waiting for the full response.
# ──────────────────────────────────────────────────────────────────────────────

def build_groq_llm() -> lk_openai.LLM:
    return lk_openai.LLM(
        model    = "llama-3.3-70b-versatile",
        api_key  = GROQ_API_KEY,
        base_url = GROQ_BASE_URL,
    )


# ──────────────────────────────────────────────────────────────────────────────
# 7. SILERO VAD — Voice Activity Detection tuning
#
#   ┌─────────────────────────────────────────────────────────┐
#   │ Parameter guide — adjust to match your audio quality:  │
#   │                                                         │
#   │ min_silence_duration_ms                                 │
#   │   How long silence must persist before the caller is    │
#   │   considered to have finished speaking.                 │
#   │   • Lower (e.g. 300ms) → faster response but may clip  │
#   │     slow speakers or sentences with natural pauses.     │
#   │   • Higher (e.g. 600ms) → more patient but may feel    │
#   │     sluggish.  400ms is a solid default.                │
#   │                                                         │
#   │ speech_pad_ms                                           │
#   │   Extra audio appended to the end of each speech        │
#   │   segment to avoid clipping the last phoneme.           │
#   │   200ms works well for most cases.                      │
#   │                                                         │
#   │ threshold (uncomment to tune)                           │
#   │   0–1 probability score that triggers speech detection. │
#   │   0.5 is balanced; raise to 0.7 in noisy environments  │
#   │   to reduce false positives (music, background chatter).│
#   │                                                         │
#   │ min_speech_duration_ms (uncomment to tune)              │
#   │   Ignore speech bursts shorter than this value.         │
#   │   Useful to filter out coughs, chair creaks, etc.       │
#   └─────────────────────────────────────────────────────────┘
# ──────────────────────────────────────────────────────────────────────────────

def build_silero_vad() -> silero.VAD:
    return silero.VAD.load(
        min_silence_duration    = 0.4,   # Wait 0.4s of silence before endpoint
        prefix_padding_duration = 0.2,   # Buffer 0.2s before/after speech ends
    )


# ──────────────────────────────────────────────────────────────────────────────
# 8. ORDER AGENT
#    Subclasses livekit.agents.Agent to hook into conversation events.
#    Tracks the full transcript and detected language for post-call logging.
# ──────────────────────────────────────────────────────────────────────────────

class OrderAgent(Agent):
    """LiveKit Agent that manages one phone call, logs everything to Airtable."""

    def __init__(self, *, call_id: str, caller_number: str, tts_plugin: SarvamTTS) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.call_id       = call_id
        self.caller_number = caller_number
        self._tts_plugin   = tts_plugin
        self._start_time   = asyncio.get_event_loop().time()
        self._transcript_lines: list[str] = []
        self._detected_lang = "en"   # Default; will be updated on first STT event

    # ── Hook: called each time the caller finishes speaking ──────────────────
    async def on_user_turn_completed(self, chat_ctx, new_message) -> None:  # type: ignore[override]
        # Capture caller's words
        text = getattr(new_message, "text_content", None) or ""
        if text:
            self._transcript_lines.append(f"Caller: {text}")

        # Detect language from the Whisper metadata if available
        lang = getattr(new_message, "detected_language", None)
        if lang:
            lang_code = lang[:2].lower()   # "hi-IN" → "hi"
            if lang_code != self._detected_lang:
                self._detected_lang = lang_code
                voice_code = LANGUAGE_VOICE_MAP.get(lang_code, DEFAULT_VOICE)
                self._tts_plugin.update_voice(voice_code)
                logger.info("Language switched: %s → voice %s", lang_code, voice_code)

        await super().on_user_turn_completed(chat_ctx, new_message)

    # ── Hook: called each time the agent finishes speaking ───────────────────
    async def on_assistant_turn_completed(self, chat_ctx, new_message) -> None:  # type: ignore[override]
        text = getattr(new_message, "text_content", None) or ""
        if text:
            self._transcript_lines.append(f"Agent: {text}")
        await super().on_assistant_turn_completed(chat_ctx, new_message)

    # ── Post-call: log to Airtable ────────────────────────────────────────────
    async def finalize_call(self) -> None:
        duration   = asyncio.get_event_loop().time() - self._start_time
        transcript = "\n".join(self._transcript_lines)
        voice_code = LANGUAGE_VOICE_MAP.get(self._detected_lang, DEFAULT_VOICE)

        logger.info("Finalizing call %s. Duration: %.1f s", self.call_id, duration)

        # Run both Airtable writes concurrently; errors in either are swallowed
        await asyncio.gather(
            log_call_to_airtable(
                call_id          = self.call_id,
                caller_number    = self.caller_number,
                duration_seconds = duration,
                transcript       = transcript,
                language_detected= voice_code,
            ),
            extract_and_log_order(
                call_id    = self.call_id,
                transcript = transcript,
            ),
            return_exceptions=True,
        )
        logger.info("Call %s finalized.", self.call_id)


# ──────────────────────────────────────────────────────────────────────────────
# 9. AGENT ENTRYPOINT
#    LiveKit calls this for every new room — both inbound SIP calls AND rooms
#    created by call_customer() for outbound dialing.
# ──────────────────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    """
    Bootstraps the full STT → LLM → TTS pipeline for one phone call session.
    Automatically handles both inbound and outbound calls because both create
    a LiveKit room that triggers this entrypoint.
    """
    call_id       = str(uuid.uuid4())
    # Room metadata carries the caller phone number when set by the SIP gateway
    caller_number = ctx.room.metadata or "unknown"
    logger.info("New call: call_id=%s  caller=%s", call_id, caller_number)

    # Build pipeline components
    vad_plugin = build_silero_vad()
    stt_plugin = build_groq_stt()
    llm_plugin = build_groq_llm()
    tts_plugin = SarvamTTS(api_key=SARVAM_API_KEY, voice=DEFAULT_VOICE)

    agent = OrderAgent(
        call_id       = call_id,
        caller_number = caller_number,
        tts_plugin    = tts_plugin,
    )

    await ctx.connect()

    # ── AgentSession wires the STT → LLM → TTS pipeline together ─────────────
    session = AgentSession(
        stt = stt_plugin,
        llm = llm_plugin,
        tts = tts_plugin,
        vad = vad_plugin,
        turn_handling = TurnHandlingOptions(
            interruption = InterruptionOptions(
                enabled = True,
                min_duration = 0.5,
            ),
            endpointing = EndpointingOptions(
                min_delay = 0.5,
            )
        )
    )

    # ── Cost guard: auto-disconnect after MAX_CALL_DURATION seconds ───────────
    async def _enforce_max_duration() -> None:
        await asyncio.sleep(MAX_CALL_DURATION)
        logger.warning("Max call duration (%d s) reached. Disconnecting.", MAX_CALL_DURATION)
        try:
            await session.say(
                "I'm sorry, we've reached the maximum call duration. "
                "Thank you for calling Automaton AI. Goodbye!",
                allow_interruptions=False,
            )
        finally:
            await ctx.room.disconnect()

    asyncio.ensure_future(_enforce_max_duration())

    try:
        await session.start(
            room              = ctx.room,
            agent             = agent,
            room_input_options= RoomInputOptions(),
        )
        # Trigger the initial greeting based on the system prompt
        await session.generate_reply(
            instructions="Greet the customer warmly and begin collecting their order."
        )
        # Block until room disconnects (call ends)
        while ctx.room.connection_state != rtc.ConnectionState.CONN_DISCONNECTED:
            await asyncio.sleep(1)
    finally:
        # Always save call data — even if an exception occurred mid-call
        await agent.finalize_call()


# ──────────────────────────────────────────────────────────────────────────────
# 10. OUTBOUND CALL HELPER
#     Creates a dedicated LiveKit room and instructs Twilio (via LiveKit SIP)
#     to dial the customer. The same entrypoint() function above handles
#     the actual conversation once the customer picks up.
# ──────────────────────────────────────────────────────────────────────────────

async def call_customer(phone_number: str) -> str:
    """
    Dial a customer via Twilio PSTN.

    Args:
        phone_number: E.164 formatted number, e.g. "+919876543210"

    Returns:
        The LiveKit room name created for this call.

    Example:
        import asyncio
        from agent import call_customer
        asyncio.run(call_customer("+919876543210"))
    """
    room_name = f"outbound-{uuid.uuid4()}"
    sip_url   = f"sip:{phone_number}@pstn.twilio.com"

    # For API calls, we need the https:// version of the URL
    api_url = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")

    lk_client = lk_api.LiveKitAPI(
        url        = api_url,
        api_key    = LIVEKIT_API_KEY,
        api_secret = LIVEKIT_API_SECRET,
    )

    try:
        # 1. Create the room first so the agent can be dispatched into it
        await lk_client.room.create_room(
            lk_api.CreateRoomRequest(name=room_name)
        )
        logger.info("Created outbound room: %s", room_name)

        # 2. Tell LiveKit's SIP to dial the customer via the Twilio trunk
        await lk_client.sip.create_sip_participant(
            lk_api.CreateSIPParticipantRequest(
                sip_trunk_id         = LIVEKIT_SIP_TRUNK,
                sip_call_to          = phone_number,
                sip_number           = TWILIO_PHONE,
                room_name            = room_name,
                participant_identity = f"customer-{phone_number}",
                participant_name     = "Customer",
                # Uncomment below to send DTMF tones after answer (e.g. to skip IVR menus)
                # dtmf_digits        = "1",
            )
        )
        logger.info("Outbound SIP call dispatched → %s (room: %s)", phone_number, room_name)

    finally:
        await lk_client.aclose()

    return room_name


# ──────────────────────────────────────────────────────────────────────────────
# 11. MAIN — Start the LiveKit Worker
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(entrypoint_fnc=entrypoint)
        # LiveKit SDK reads LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
        # automatically from environment variables.
    )
