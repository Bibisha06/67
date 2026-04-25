"""
agent.py — Automaton AI Infosystem Voice Agent
================================================
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import uuid
import re
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
from livekit.plugins import openai as lk_openai
from livekit.plugins import silero

from menu import fuzzy_match_item

load_dotenv()

LIVEKIT_URL        = os.environ["LIVEKIT_URL"]
LIVEKIT_API_KEY    = os.environ["LIVEKIT_API_KEY"]
LIVEKIT_API_SECRET = os.environ["LIVEKIT_API_SECRET"]
LIVEKIT_SIP_TRUNK  = os.environ["LIVEKIT_SIP_TRUNK_ID"]

GROQ_API_KEY  = os.environ["GROQ_API_KEY"]
GROQ_BASE_URL = "https://api.groq.com/openai/v1"

SARVAM_API_KEY = os.environ["SARVAM_API_KEY"]
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"

TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN  = os.environ["TWILIO_AUTH_TOKEN"]
TWILIO_PHONE       = os.environ["TWILIO_PHONE_NUMBER"]

AIRTABLE_PAT     = os.environ["AIRTABLE_PAT"]
AIRTABLE_BASE_ID = os.environ["AIRTABLE_BASE_ID"]
AIRTABLE_API_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}"

MAX_CALL_DURATION = int(os.getenv("MAX_CALL_DURATION_SECONDS", "300"))

logger = logging.getLogger("voice-agent")

# ── LANGUAGE CONFIG ────────────────────────────────────────────────────────────

LANGUAGE_VOICE_MAP: dict[str, str] = {
    "hi": "hi-IN",
    "kn": "kn-IN",
    "mr": "mr-IN",
    "en": "en-IN",
}

# Strict allowlist — ONLY these 4 are accepted. Anything else triggers the gate.
SUPPORTED_LANGS = {"en", "hi", "kn", "mr"}

# How many consecutive unsupported-language turns before we hang up
MAX_LANG_RETRIES = 3

# Single pre-built fallback line covering all 4 languages, played when Whisper
# detects a language outside our supported set.
UNSUPPORTED_LANG_PROMPT = (
    "Sorry, we only support English, Hindi, Kannada, and Marathi. "
    "Please speak in one of these languages. | "
    "क्षमा करें, हम केवल अंग्रेज़ी, हिंदी, कन्नड़ और मराठी में सेवा देते हैं। "
    "कृपया इनमें से किसी एक भाषा में बोलें। | "
    "ಕ್ಷಮಿಸಿ, ನಾವು ಕೇವಲ ಇಂಗ್ಲಿಷ್, ಹಿಂದಿ, ಕನ್ನಡ ಮತ್ತು ಮರಾಠಿಯಲ್ಲಿ ಸೇವೆ ನೀಡುತ್ತೇವೆ. "
    "ದಯವಿಟ್ಟು ಈ ಭಾಷೆಗಳಲ್ಲಿ ಒಂದರಲ್ಲಿ ಮಾತನಾಡಿ. | "
    "माफ करा, आम्ही फक्त इंग्रजी, हिंदी, कन्नड आणि मराठीत सेवा देतो. "
    "कृपया यापैकी एका भाषेत बोला."
)

UNSUPPORTED_LANG_GOODBYE = (
    "Sorry, we are unable to continue as the spoken language is not supported. "
    "We only accept English, Hindi, Kannada, and Marathi. Goodbye! | "
    "क्षमा करें, हम आगे नहीं बढ़ सकते। केवल अंग्रेज़ी, हिंदी, कन्नड़ और मराठी स्वीकार्य हैं। धन्यवाद! | "
    "ಕ್ಷಮಿಸಿ, ನಾವು ಮುಂದುವರಿಯಲು ಸಾಧ್ಯವಿಲ್ಲ. ಧನ್ಯವಾದ! | "
    "माफ करा, आम्ही पुढे जाऊ शकत नाही. धन्यवाद!"
)

DEFAULT_VOICE = "en-IN"

# ── RESPONSES & AUDIO CACHE ───────────────────────────────────────────────────

with open("responses.json", "r", encoding="utf-8") as f:
    RESPONSES = json.load(f)

AUDIO_CACHE: dict[str, bytes] = {}

_templates_str = json.dumps(RESPONSES, ensure_ascii=False, indent=2)

DEFAULT_PROMPT = (
    "You are a polite and efficient order acceptance agent for Automaton AI Infosystem. "
    "Your job is to accept customer orders over a phone call. "
    "CRITICAL: You MUST ONLY respond in English, Hindi, Kannada, or Marathi. "
    "These are the ONLY four languages you are permitted to speak. "
    "If the customer speaks in any other language, do NOT attempt to reply in that language. "
    "Instead, play the unsupported language prompt and wait for them to switch. "
    "Always respond in the exact same language the customer is currently speaking "
    "(from the four supported languages only). "
    "If the user gives multiple pieces of information at once, accept them naturally. "
    "Follow this exact flow: "
    "1) Greet the customer warmly and ask what they would like to order. "
    "2) Collect any missing details: item name, quantity, and delivery address. "
    "3) Read back the full order details and ask for confirmation. "
    "4) Thank them and close the call. "
    "\nCRITICAL INSTRUCTION FOR LOW LATENCY: "
    "Whenever appropriate and natural, you MUST use one of the exact translated sentences "
    "from the JSON object below verbatim, matching the user's language. "
    "This allows us to use pre-generated audio caches:\n"
    f"{_templates_str}\n"
    "Only generate custom/dynamic text if the user says something complex that requires "
    "a specific natural response. Keep it brief. Do not output JSON, just say the sentence."
)
SYSTEM_PROMPT = os.getenv("AGENT_SYSTEM_PROMPT", DEFAULT_PROMPT)


# ── PREWARM ───────────────────────────────────────────────────────────────────

async def prewarm_audio_cache(*args, **kwargs):
    """Generates Sarvam TTS for all predefined responses and caches as PCM."""
    logger.info("Pre-warming audio cache...")

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type":         "application/json",
    }

    async def fetch_pcm(text: str, voice_code: str) -> bytes | None:
        payload = {
            "inputs":               [text],
            "target_language_code": voice_code,
            "speaker":              "anushka",
            "model":                "bulbul:v2",
            "enable_preprocessing": True,
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(SARVAM_TTS_URL, headers=headers, json=payload) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("audios"):
                        return base64.b64decode(data["audios"][0])[44:]  # strip WAV header
        return None

    # Pre-generate regular intents
    for intent, variants in RESPONSES.items():
        if isinstance(variants, dict):
            for lang, text in variants.items():
                if text not in AUDIO_CACHE:
                    voice_code = LANGUAGE_VOICE_MAP.get(lang.lower(), DEFAULT_VOICE)
                    pcm = await fetch_pcm(text, voice_code)
                    if pcm:
                        AUDIO_CACHE[text] = pcm

    # Pre-generate language_not_detected fallback sequence
    for text in RESPONSES.get("language_not_detected", {}).get("fallback_sequence", []):
        if text not in AUDIO_CACHE:
            pcm = await fetch_pcm(text, DEFAULT_VOICE)
            if pcm:
                AUDIO_CACHE[text] = pcm

    # Pre-generate the strict unsupported-language prompts (en-IN voice reads the
    # combined 4-language string — Sarvam handles multilingual mixed input)
    for combined_text in (UNSUPPORTED_LANG_PROMPT, UNSUPPORTED_LANG_GOODBYE):
        if combined_text not in AUDIO_CACHE:
            pcm = await fetch_pcm(combined_text, DEFAULT_VOICE)
            if pcm:
                AUDIO_CACHE[combined_text] = pcm

    logger.info("Audio cache pre-warmed with %d entries.", len(AUDIO_CACHE))


# ── AIRTABLE HELPERS ──────────────────────────────────────────────────────────

async def _airtable_post(table: str, fields: dict) -> None:
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
    *, call_id: str, caller_number: str, duration_seconds: float,
    transcript: str, language_detected: str,
) -> None:
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
            temperature=0,
        )
        raw = response.choices[0].message.content.strip()
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


# ── SARVAM TTS PLUGIN ─────────────────────────────────────────────────────────

class SarvamTTS(TTS):
    SAMPLE_RATE  = 22050
    NUM_CHANNELS = 1

    def __init__(self, *, api_key: str, voice: str = "en-IN") -> None:
        super().__init__(
            capabilities=TTSCapabilities(streaming=False, aligned_transcript=False),
            sample_rate=self.SAMPLE_RATE,
            num_channels=self.NUM_CHANNELS,
        )
        self._api_key = api_key
        self._voice   = voice

    def update_voice(self, voice_code: str) -> None:
        logger.info("Sarvam TTS: switching voice to '%s'", voice_code)
        self._voice = voice_code

    def synthesize(
        self,
        text: str,
        *,
        conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS,
    ) -> "SarvamChunkedStream":
        return SarvamChunkedStream(tts=self, input_text=text, conn_options=conn_options)


class SarvamChunkedStream(ChunkedStream):
    async def _run(self, output_emitter) -> None:  # type: ignore[override]
        tts: SarvamTTS = self._tts  # type: ignore[assignment]

        output_emitter.initialize(
            request_id   = shortuuid(),
            sample_rate  = tts.sample_rate,
            num_channels = tts.num_channels,
            mime_type    = "audio/pcm",
            stream       = False,
        )

        # Serve from cache if available (zero latency)
        if self._input_text in AUDIO_CACHE:
            output_emitter.push(AUDIO_CACHE[self._input_text])
            output_emitter.flush()
            return

        payload = {
            "inputs":               [self._input_text],
            "target_language_code": tts._voice,
            "speaker":              "anushka",
            "model":                "bulbul:v2",
            "enable_preprocessing": True,
        }
        headers = {
            "api-subscription-key": tts._api_key,
            "Content-Type":         "application/json",
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(SARVAM_TTS_URL, headers=headers, json=payload) as resp:
                if resp.status != 200:
                    return
                data = await resp.json()

        if not data.get("audios"):
            return
        audio_bytes = base64.b64decode(data["audios"][0])
        if len(audio_bytes) < 45:
            return
        pcm_bytes = audio_bytes[44:]

        # Store in cache for future calls
        AUDIO_CACHE[self._input_text] = pcm_bytes

        output_emitter.push(pcm_bytes)
        output_emitter.flush()


# ── STT & VAD ─────────────────────────────────────────────────────────────────

def build_groq_stt() -> lk_openai.STT:
    return lk_openai.STT(
        model    = "whisper-large-v3",
        language = "",           # auto-detect; we enforce the allowlist ourselves
        api_key  = GROQ_API_KEY,
        base_url = GROQ_BASE_URL,
    )

def build_silero_vad() -> silero.VAD:
    return silero.VAD.load(
        min_silence_duration    = 0.5,
        prefix_padding_duration = 0.1,
    )


# ── ORDER AGENT ───────────────────────────────────────────────────────────────

class OrderAgent(Agent):
    def __init__(self, *, call_id: str, caller_number: str, tts_plugin: SarvamTTS) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.call_id        = call_id
        self.caller_number  = caller_number
        self._tts_plugin    = tts_plugin
        self._start_time    = asyncio.get_event_loop().time()
        self._transcript_lines: list[str] = []
        self._detected_lang = "en"

        # Strict language gate state
        self._lang_retry_count = 0          # consecutive turns in an unsupported language
        self._lang_gate_active = False      # True once the gate fires; prevents LLM call

    # ── helpers ───────────────────────────────────────────────────────────────

    def get_response(self, intent: str) -> str:
        variants = RESPONSES.get(intent)
        if isinstance(variants, dict):
            return variants.get(self._detected_lang, variants.get("en", ""))
        return ""

    def _derive_lang(self, text: str) -> str | None:
        """
        Keyword / script-based language override.
        Returns a 2-char lang code or None if nothing matches.
        """
        text_lower = text.lower()

        # Kannada — Unicode block U+0C80–U+0CFF or common romanised words
        if re.search(r'[\u0C80-\u0CFF]', text) or re.search(
            r'\b(namaskara|beku|kodi|illa|houdu|yenu|nanna|nimage)\b', text_lower
        ):
            return "kn"

        # Marathi — Devanagari markers distinct from Hindi
        if re.search(r'\b(आहे|मला|तुम्हाला|काय|पाहिजे|होय|द्या|करतो)\b', text) or re.search(
            r'\b(ahe|mala|tumhala|pahije|dya)\b', text_lower
        ):
            return "mr"

        # Hindi
        if re.search(r'\b(है|मुझे|आपको|क्या|चाहिए)\b', text) or re.search(
            r'\b(hai|mujhe|aapko|chahiye)\b', text_lower
        ):
            return "hi"

        return None

    # ── turn handler ──────────────────────────────────────────────────────────

    async def on_user_turn_completed(self, chat_ctx, new_message) -> None:  # type: ignore[override]
        text       = (getattr(new_message, "text_content", None) or "").strip()
        text_lower = text.lower()

        # ── 1. Resolve language ───────────────────────────────────────────────
        derived_lang = self._derive_lang(text)
        base_lang    = getattr(new_message, "detected_language", None)
        whisper_lang = base_lang[:2].lower() if base_lang else None

        # Keyword override wins; otherwise trust Whisper
        lang = derived_lang or whisper_lang

        # ── 2. STRICT LANGUAGE GATE ──────────────────────────────────────────
        #
        # If Whisper (or the script detector) gives us a language that is NOT
        # in our supported set, we refuse to pass the turn to the LLM.
        #
        if lang and lang not in SUPPORTED_LANGS:
            self._lang_retry_count += 1
            self._lang_gate_active  = True

            logger.warning(
                "Unsupported language '%s' detected (attempt %d/%d). Blocking LLM.",
                lang, self._lang_retry_count, MAX_LANG_RETRIES,
            )

            if self._lang_retry_count >= MAX_LANG_RETRIES:
                # Three strikes — hang up
                logger.warning("Max unsupported-language retries reached. Hanging up.")
                self._transcript_lines.append(f"[SYSTEM: unsupported language '{lang}', call terminated]")
                if self._session is not None:
                    await self._session.say(UNSUPPORTED_LANG_GOODBYE, allow_interruptions=False)
                asyncio.create_task(self.disconnect_after_delay(delay=3))
            else:
                # Ask them to switch — play the 4-language combined prompt
                self._transcript_lines.append(f"[SYSTEM: unsupported language '{lang}', retry {self._lang_retry_count}]")
                if self._session is not None:
                    await self._session.say(UNSUPPORTED_LANG_PROMPT, allow_interruptions=True)

            # Do NOT call super() — the LLM must never see this turn
            return

        # ── 3. Valid language turn — reset the gate ───────────────────────────
        self._lang_retry_count = 0
        self._lang_gate_active = False

        # Switch voice if the language changed (only on substantial utterances
        # or when a keyword override is confident)
        is_substantial = len(text.split()) >= 3
        if lang and (derived_lang or is_substantial or self._detected_lang == "en"):
            if lang != self._detected_lang:
                self._detected_lang = lang
                voice_code = LANGUAGE_VOICE_MAP[lang]
                self._tts_plugin.update_voice(voice_code)
                logger.info("Switched detected language to '%s', voice to '%s'.", lang, voice_code)

        # ── 4. Normal flow ────────────────────────────────────────────────────
        if text:
            self._transcript_lines.append(f"Caller: {text}")
            await super().on_user_turn_completed(chat_ctx, new_message)
        else:
            # Nothing heard — play the no-speech template for the current language
            if self._session is not None:
                resp_text = self.get_response("no_speech_detected")
                self._transcript_lines.append(f"Agent: {resp_text}")
                await self._session.say(resp_text, allow_interruptions=True)

    # ── assistant turn ────────────────────────────────────────────────────────

    async def on_assistant_turn_completed(self, chat_ctx, new_message) -> None:  # type: ignore[override]
        text = (getattr(new_message, "text_content", None) or "").strip()
        if text:
            self._transcript_lines.append(f"Agent: {text}")
            if "successfully" in text.lower() or "धन्यवाद" in text:
                asyncio.create_task(self.disconnect_after_delay())
        await super().on_assistant_turn_completed(chat_ctx, new_message)

    # ── utilities ─────────────────────────────────────────────────────────────

    async def disconnect_after_delay(self, delay: float = 2.0) -> None:
        await asyncio.sleep(delay)
        if self._session and self._session.room:
            await self._session.room.disconnect()

    async def finalize_call(self) -> None:
        duration   = asyncio.get_event_loop().time() - self._start_time
        transcript = "\n".join(self._transcript_lines)
        voice_code = LANGUAGE_VOICE_MAP.get(self._detected_lang, DEFAULT_VOICE)

        logger.info("Finalizing call %s.", self.call_id)
        await asyncio.gather(
            log_call_to_airtable(
                call_id=self.call_id,
                caller_number=self.caller_number,
                duration_seconds=duration,
                transcript=transcript,
                language_detected=voice_code,
            ),
            extract_and_log_order(call_id=self.call_id, transcript=transcript),
            return_exceptions=True,
        )
        logger.info("Call %s finalized.", self.call_id)


# ── ENTRYPOINT ────────────────────────────────────────────────────────────────

async def entrypoint(ctx: JobContext) -> None:
    call_id       = str(uuid.uuid4())
    caller_number = ctx.room.metadata or "unknown"

    vad_plugin = build_silero_vad()
    stt_plugin = build_groq_stt()
    llm_plugin = lk_openai.LLM(
        model    = "llama-3.3-70b-versatile",
        api_key  = GROQ_API_KEY,
        base_url = GROQ_BASE_URL,
    )
    tts_plugin = SarvamTTS(api_key=SARVAM_API_KEY, voice=DEFAULT_VOICE)

    agent = OrderAgent(
        call_id       = call_id,
        caller_number = caller_number,
        tts_plugin    = tts_plugin,
    )

    await ctx.connect()

    session = AgentSession(
        stt = stt_plugin,
        llm = llm_plugin,
        tts = tts_plugin,
        vad = vad_plugin,
        turn_handling = TurnHandlingOptions(
            interruption = InterruptionOptions(enabled=True, min_duration=0.5),
            endpointing  = EndpointingOptions(min_delay=0.5),
        ),
    )

    async def _enforce_max_duration() -> None:
        await asyncio.sleep(MAX_CALL_DURATION)
        try:
            if session.room.connection_state != rtc.ConnectionState.CONN_DISCONNECTED:
                await session.say("I'm sorry, max duration reached. Goodbye!", allow_interruptions=False)
        finally:
            await ctx.room.disconnect()

    asyncio.ensure_future(_enforce_max_duration())

    try:
        await session.start(
            room             = ctx.room,
            agent            = agent,
            room_input_options = RoomInputOptions(),
        )
        await session.generate_reply(
            instructions=(
                "Emit exactly 'Hello! Welcome to our store. What would you like to order today?' "
                "to match the cached greeting."
            )
        )
        while ctx.room.connection_state != rtc.ConnectionState.CONN_DISCONNECTED:
            await asyncio.sleep(1)
    finally:
        await agent.finalize_call()


# ── OUTBOUND CALL HELPER ──────────────────────────────────────────────────────

async def call_customer(phone_number: str) -> str:
    room_name = f"outbound-{uuid.uuid4()}"
    api_url   = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
    lk_client = lk_api.LiveKitAPI(url=api_url, api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET)
    try:
        await lk_client.room.create_room(lk_api.CreateRoomRequest(name=room_name))
        await lk_client.sip.create_sip_participant(
            lk_api.CreateSIPParticipantRequest(
                sip_trunk_id         = LIVEKIT_SIP_TRUNK,
                sip_call_to          = phone_number,
                sip_number           = TWILIO_PHONE,
                room_name            = room_name,
                participant_identity = f"customer-{phone_number}",
                participant_name     = "Customer",
            )
        )
    finally:
        await lk_client.aclose()
    return room_name


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc = entrypoint,
            prewarm_fnc    = prewarm_audio_cache,
        )
    )