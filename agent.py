"""
agent.py — Automaton AI Infosystem Voice Agent (Optimized)
============================================================

Optimizations applied:
  1. Persistent aiohttp.ClientSession — shared across TTS, prewarm, Airtable
  2. Whisper prompt steering — Indic script prompts for better recognition
  3. Trimmed LLM prompt + max_tokens cap + lower temperature
  4. VAD & endpointing tuned for Indic speakers
  5. Smarter STT hint management — avoid unnecessary rebuilds
  6. Connection-pooled prewarm with larger batch size
"""
from __future__ import annotations

import asyncio
import atexit
import base64
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

import aiohttp
from dotenv import load_dotenv

from livekit import api as lk_api, rtc
from livekit.agents import JobContext, RoomInputOptions, WorkerOptions, cli
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.voice.turn import (
    EndpointingOptions,
    InterruptionOptions,
    TurnHandlingOptions,
)
from livekit.agents.tts import TTS, TTSCapabilities, ChunkedStream
from livekit.agents.types import DEFAULT_API_CONNECT_OPTIONS, APIConnectOptions
from livekit.agents.utils import shortuuid
from livekit.plugins import openai as lk_openai
from livekit.plugins import silero

from menu import fuzzy_match_item, get_menu_summary, MENU

load_dotenv()

# ── ENV ───────────────────────────────────────────────────────────────────────
LIVEKIT_URL        = os.environ["LIVEKIT_URL"]
LIVEKIT_API_KEY    = os.environ["LIVEKIT_API_KEY"]
LIVEKIT_API_SECRET = os.environ["LIVEKIT_API_SECRET"]
LIVEKIT_SIP_TRUNK  = os.environ["LIVEKIT_SIP_TRUNK_ID"]
GROQ_API_KEY       = os.environ["GROQ_API_KEY"]
GROQ_BASE_URL      = "https://api.groq.com/openai/v1"
SARVAM_API_KEY     = os.environ["SARVAM_API_KEY"]
SARVAM_TTS_URL     = "https://api.sarvam.ai/text-to-speech"
TWILIO_ACCOUNT_SID = os.environ["TWILIO_ACCOUNT_SID"]
TWILIO_AUTH_TOKEN  = os.environ["TWILIO_AUTH_TOKEN"]
TWILIO_PHONE       = os.environ["TWILIO_PHONE_NUMBER"]
AIRTABLE_PAT       = os.environ["AIRTABLE_PAT"]
AIRTABLE_BASE_ID   = os.environ["AIRTABLE_BASE_ID"]
AIRTABLE_API_URL   = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}"
MAX_CALL_DURATION  = int(os.getenv("MAX_CALL_DURATION_SECONDS", "300"))

logger = logging.getLogger("voice-agent")

# ── PERSISTENT HTTP SESSION ───────────────────────────────────────────────────
# Single shared session eliminates TCP+TLS handshake overhead on every request.
_http_session: Optional[aiohttp.ClientSession] = None


async def _get_session() -> aiohttp.ClientSession:
    global _http_session
    if _http_session is None or _http_session.closed:
        connector = aiohttp.TCPConnector(limit=15, keepalive_timeout=60)
        _http_session = aiohttp.ClientSession(connector=connector)
    return _http_session


async def _close_session() -> None:
    global _http_session
    if _http_session and not _http_session.closed:
        await _http_session.close()
        _http_session = None


# ── LANGUAGE CONFIG ───────────────────────────────────────────────────────────
LANGUAGE_VOICE_MAP: dict[str, str] = {
    "hi": "hi-IN",
    "kn": "kn-IN",
    "mr": "mr-IN",
    "en": "en-IN",
}
SUPPORTED_LANGS  = {"en", "hi", "kn", "mr"}
MAX_LANG_RETRIES = 3
DEFAULT_VOICE    = "en-IN"

# ── WHISPER PROMPT STEERING ──────────────────────────────────────────────────
# Providing a script-native prompt dramatically improves Whisper accuracy
# for short Indic utterances by biasing the decoder toward the correct script.
WHISPER_PROMPTS: dict[str, str] = {
    "hi": "नमस्ते, मुझे ऑर्डर करना है। हाँ, मुझे पेन और नोटबुक चाहिए।",
    "kn": "ನಮಸ್ಕಾರ, ನನಗೆ ಆರ್ಡರ್ ಮಾಡಬೇಕು. ಹೌದು, ನನಗೆ ಪೆನ್ ಮತ್ತು ನೋಟ್ಬುಕ್ ಬೇಕು.",
    "mr": "नमस्कार, मला ऑर्डर करायचे आहे. होय, मला पेन आणि नोटवही पाहिजे.",
    "en": "Hello, I would like to place an order. Yes, I need pens and notebooks.",
}

# ── UNICODE / KEYWORD MATCHERS ────────────────────────────────────────────────
_KANNADA_RE    = re.compile(r'[\u0C80-\u0CFF]')
_DEVANAGARI_RE = re.compile(r'[\u0900-\u097F]')
_MARATHI_WORDS_RE = re.compile(
    r'\b(आहे|नाही|मला|तुम्ही|आम्ही|काय|पाहिजे|होय|द्या|करतो|असेल|माझे|आपले)\b'
)
_HINDI_WORDS_RE = re.compile(
    r'\b(है|हैं|मुझे|आपको|क्या|चाहिए|करना|होना|यहाँ|वहाँ|जाना)\b'
)
_KN_ROMAN_RE = re.compile(
    r'\b(namaskara|beku|kodi|illa|houdu|yenu|nanna|nimage|yavaga|nimma)\b', re.I
)
_MR_ROMAN_RE = re.compile(
    r'\b(ahe|nahi|mala|tumhi|amhi|pahije|dya|kartos)\b', re.I
)
_HI_ROMAN_RE = re.compile(
    r'\b(hai|hain|mujhe|aapko|chahiye|karna|hona|yahan|wahan)\b', re.I
)

# ── UNSUPPORTED LANGUAGE PROMPTS ──────────────────────────────────────────────
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

# ── RESPONSES CACHE ───────────────────────────────────────────────────────────
with open("responses.json", "r", encoding="utf-8") as f:
    RESPONSES = json.load(f)
AUDIO_CACHE: dict[str, bytes] = {}
_templates_str = json.dumps(RESPONSES, ensure_ascii=False, indent=2)

# ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
_CATALOGUE = get_menu_summary()

_FEW_SHOT_EXAMPLES = """
=== FEW-SHOT EXAMPLES — follow these patterns exactly ===

--- Example 1: English, single item ---
Agent: Hello! Welcome to our store. What would you like to order today?
Caller: I need 3 pencils please.
Agent: Sure! 3 Pencils at ₹5 each — ₹15 total. May I have your delivery address?

--- Example 2: Hindi, multiple items ---
Agent: नमस्ते! हमारी दुकान में आपका स्वागत है। आप क्या ऑर्डर करना चाहेंगे?
Caller: मुझे 2 नोटबुक और एक स्टेपलर चाहिए।
Agent: बिल्कुल! 2 नोटबुक (₹40 प्रत्येक) और 1 स्टेपलर (₹120)। कुल ₹200। आपका डिलीवरी पता क्या है?

--- Example 3: Kannada ---
Agent: ನಮಸ್ಕಾರ! ನಮ್ಮ ಅಂಗಡಿಗೆ ಸ್ವಾಗತ. ನೀವು ಏನು ಆರ್ಡರ್ ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?
Caller: ನನಗೆ 5 ಪೆನ್ ಮತ್ತು 2 ರಬ್ಬರ್ ಬೇಕು.
Agent: ಸರಿ! 5 Ballpoint Pen (₹10 ಪ್ರತಿ) ಮತ್ತು 2 Eraser (₹5 ಪ್ರತಿ). ಒಟ್ಟು ₹60. ನಿಮ್ಮ ವಿಳಾಸ ಏನು?

--- Example 4: Marathi ---
Agent: नमस्कार! आमच्या दुकानात आपले स्वागत आहे. आपण काय ऑर्डर करू इच्छिता?
Caller: मला 10 A4 कागद आणि 1 कात्री पाहिजे.
Agent: नक्की! 1 A4 Paper Ream (₹250) आणि 1 Scissors (₹35). एकूण ₹285. तुमचा पत्ता सांगा.

--- Example 5: Item not in catalogue ---
Agent: Hello! What would you like to order?
Caller: I'd like a printer please.
Agent: I'm sorry, we don't carry printers. We stock stationery items like pens, notebooks, staplers, and more. Can I help you with any of those?

=== END OF EXAMPLES ===
"""

DEFAULT_PROMPT = (
    "You are a polite and efficient order-acceptance agent for Automaton AI Infosystem, "
    "a stationery and office-supplies store.\n\n"

    "PRODUCT CATALOGUE (you may ONLY sell items from this list):\n"
    f"{_CATALOGUE}\n\n"

    "If a caller asks for something not in this catalogue, politely say it is not available "
    "and suggest the closest item if relevant. Never invent items or prices.\n\n"

    "LANGUAGE RULES (CRITICAL, DO NOT VIOLATE):\n"
    "• You ONLY speak English, Hindi, Kannada, or Marathi.\n"
    "• DO NOT output Korean, Arabic, Japanese, Chinese, or any other language.\n"
    "• Always mirror the EXACT language the caller is using.\n"
    "• If they switch language mid-call, switch immediately.\n"
    "• Any other language → play the unsupported-language prompt. "
    "  Do NOT reply even one word in that language.\n\n"

    "CONVERSATION FLOW:\n"
    "1. Greet and ask what they'd like to order.\n"
    "2. Accept all items in one turn if the caller lists them together.\n"
    "3. State the unit price and running total as you add items.\n"
    "4. Collect any missing: quantity, delivery address, customer name.\n"
    "5. Read back the full order with the total amount and ask for confirmation.\n"
    "6. Thank them by name and close the call.\n\n"

    "STYLE:\n"
    "• Short replies — one or two sentences unless confirming a full order.\n"
    "• Never ask the same question twice.\n"
    "• Use the caller's name once you have it.\n\n"

    "CACHE OPTIMISATION:\n"
    "Use verbatim template phrases from the JSON below when they fit, "
    "so pre-generated audio plays instantly:\n"
    f"{_templates_str}\n\n"
    f"{_FEW_SHOT_EXAMPLES}"
)

SYSTEM_PROMPT = os.getenv("AGENT_SYSTEM_PROMPT", DEFAULT_PROMPT)


# ── PREWARM ───────────────────────────────────────────────────────────────────
async def prewarm_audio_cache(*args, **kwargs) -> None:
    """Pre-generates Sarvam TTS PCM for all cached response templates.
    Uses shared aiohttp session with connection pooling for speed."""
    logger.info("Pre-warming audio cache (all language variants)...")
    session = await _get_session()
    headers = {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }

    async def fetch_pcm(text: str, voice_code: str) -> bytes | None:
        payload = {
            "inputs":               [text],
            "target_language_code": voice_code,
            "speaker":              "anushka",
            "model":                "bulbul:v2",
            "enable_preprocessing": True,
        }
        try:
            async with session.post(
                SARVAM_TTS_URL, headers=headers, json=payload,
                timeout=aiohttp.ClientTimeout(total=8),
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("audios"):
                        raw = base64.b64decode(data["audios"][0])
                        return raw[44:] if len(raw) > 44 else None
                else:
                    logger.warning("Sarvam prewarm HTTP %d for voice=%s", resp.status, voice_code)
        except Exception as exc:
            logger.warning("Sarvam prewarm error: %s", exc)
        return None

    tasks: list[tuple[str, str]] = []
    for intent, variants in RESPONSES.items():
        if isinstance(variants, dict):
            for lang, text in variants.items():
                if text and text not in AUDIO_CACHE:
                    tasks.append((text, LANGUAGE_VOICE_MAP.get(lang.lower(), DEFAULT_VOICE)))
    for text in RESPONSES.get("language_not_detected", {}).get("fallback_sequence", []):
        if text and text not in AUDIO_CACHE:
            tasks.append((text, DEFAULT_VOICE))
    for combined in (UNSUPPORTED_LANG_PROMPT, UNSUPPORTED_LANG_GOODBYE):
        if combined not in AUDIO_CACHE:
            tasks.append((combined, DEFAULT_VOICE))

    BATCH = 10  # 2x batch with connection pooling
    for i in range(0, len(tasks), BATCH):
        batch = tasks[i : i + BATCH]
        results = await asyncio.gather(*[fetch_pcm(t, v) for t, v in batch])
        for (text, _), pcm in zip(batch, results):
            if pcm:
                AUDIO_CACHE[text] = pcm

    logger.info("Audio cache warmed: %d entries.", len(AUDIO_CACHE))


# ── AIRTABLE HELPERS ──────────────────────────────────────────────────────────
async def _airtable_post(table: str, fields: dict) -> None:
    url = f"{AIRTABLE_API_URL}/{table}"
    headers = {"Authorization": f"Bearer {AIRTABLE_PAT}", "Content-Type": "application/json"}
    session = await _get_session()
    async with session.post(url, headers=headers, json={"fields": fields}) as resp:
        if resp.status not in (200, 201):
            body = await resp.text()
            raise RuntimeError(f"Airtable '{table}' error {resp.status}: {body}")
    logger.info("Airtable '%s' record created.", table)


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
        logger.error("call_logs write failed: %s", exc)


async def extract_and_log_order(
    *, call_id: str, transcript: str, cart: list[dict]
) -> None:
    """
    Cart (already resolved by fuzzy_match_item during the call) is the primary
    source of truth for item_ordered, quantity, and total_amount.
    LLM only extracts: customer_name, delivery_address, order_confirmed.
    """
    # ── Build cart summary from the live cart ────────────────────────────────
    if cart:
        cart_lines = [f"{e['qty']}x {e['name']} @ ₹{e['price']} each" for e in cart]
        item_ordered  = ", ".join(cart_lines)
        total_quantity = sum(e["qty"] for e in cart)
        total_amount   = sum(e["qty"] * e["price"] for e in cart)
    else:
        item_ordered  = ""
        total_quantity = 0
        total_amount   = 0

    # ── LLM extracts only what the cart doesn't know ─────────────────────────
    try:
        from openai import AsyncOpenAI
        groq = AsyncOpenAI(api_key=GROQ_API_KEY, base_url=GROQ_BASE_URL)

        extraction_prompt = (
            "Read this phone-call transcript and extract three fields only. "
            "Respond with a single JSON object and nothing else "
            "(no markdown, no explanation).\n\n"
            "Keys:\n"
            "  customer_name    — caller's name if they said it, else empty string\n"
            "  delivery_address — full address the caller gave, else empty string\n"
            "  order_confirmed  — boolean: did the caller explicitly say yes/confirm?\n\n"
            f"TRANSCRIPT:\n{transcript}\n\n"
            "JSON only:"
        )

        response = await groq.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": extraction_prompt}],
            temperature=0,
            max_tokens=120,  # Extraction is always a short JSON blob
        )
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r'^```[a-z]*\s*|\s*```$', '', raw, flags=re.M).strip()
        meta = json.loads(raw)
    except Exception as exc:
        logger.error("LLM extraction failed: %s", exc)
        meta = {}

    customer_name    = str(meta.get("customer_name",    "")).strip()[:100]
    delivery_address = str(meta.get("delivery_address", "")).strip()[:300]
    order_confirmed  = bool(meta.get("order_confirmed", False))

    if not item_ordered:
        logger.warning("Empty cart and no items extracted — skipping order write.")
        return

    try:
        await _airtable_post("orders", {
            "call_id":          call_id,
            "customer_name":    customer_name,
            "item_ordered":     item_ordered,
            "quantity":         total_quantity,
            "total_amount":     total_amount,
            "delivery_address": delivery_address,
            "order_confirmed":  order_confirmed,
            "order_status":     "confirmed" if order_confirmed else "pending_confirmation",
            "created_at":       datetime.now(timezone.utc).isoformat(),
        })
    except Exception as exc:
        logger.error("Order Airtable write failed: %s", exc)


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
        if voice_code != self._voice:
            logger.info("TTS voice: %s → %s", self._voice, voice_code)
            self._voice = voice_code

    def synthesize(
        self, text: str, *, conn_options: APIConnectOptions = DEFAULT_API_CONNECT_OPTIONS
    ) -> "SarvamChunkedStream":
        return SarvamChunkedStream(tts=self, input_text=text, conn_options=conn_options)


class SarvamChunkedStream(ChunkedStream):
    async def _run(self, output_emitter) -> None:  # type: ignore[override]
        tts: SarvamTTS = self._tts  # type: ignore[assignment]
        output_emitter.initialize(
            request_id=shortuuid(), sample_rate=tts.sample_rate,
            num_channels=tts.num_channels, mime_type="audio/pcm", stream=False,
        )

        # ── Cache hit — instant playback ─────────────────────────────────────
        if self._input_text in AUDIO_CACHE:
            output_emitter.push(AUDIO_CACHE[self._input_text])
            output_emitter.flush()
            return

        # ── Cache miss — call Sarvam, use shared session ─────────────────────
        payload = {
            "inputs":               [self._input_text],
            "target_language_code": tts._voice,
            "speaker":              "anushka",
            "model":                "bulbul:v2",
            "enable_preprocessing": True,
        }
        headers = {"api-subscription-key": tts._api_key, "Content-Type": "application/json"}
        try:
            session = await _get_session()
            async with session.post(
                SARVAM_TTS_URL, headers=headers, json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status != 200:
                    logger.error("Sarvam TTS HTTP %d", resp.status)
                    return
                data = await resp.json()
        except Exception as exc:
            logger.error("Sarvam TTS request error: %s", exc)
            return

        if not data.get("audios"):
            return
        audio_bytes = base64.b64decode(data["audios"][0])
        if len(audio_bytes) < 45:
            return
        pcm_bytes = audio_bytes[44:]
        AUDIO_CACHE[self._input_text] = pcm_bytes
        output_emitter.push(pcm_bytes)
        output_emitter.flush()


# ── STT & VAD ─────────────────────────────────────────────────────────────────
def build_groq_stt(language_hint: str = "", prompt: str = "") -> lk_openai.STT:
    """
    language_hint: BCP-47 code ("hi", "kn", "mr", "en") or "" for auto-detect.
    prompt: Whisper prompt in the target script for better Indic recognition.
    """
    if not prompt:
        prompt = (
            "Hello, I need to place an order for pens. "
            "नमस्ते, मुझे नोटबुक और पेन चाहिए। "
            "नमस्कार, मला पेन आणि वह्या पाहिजेत. "
            "ನಮಸ್ಕಾರ, ನಾನು ಆರ್ಡರ್ ಮಾಡಬೇಕು. ನನಗೆ ಪೆನ್ ಬೇಕು."
        )
    kwargs: dict = {
        "model":    "whisper-large-v3",
        "language": language_hint,
        "api_key":  GROQ_API_KEY,
        "base_url": GROQ_BASE_URL,
    }
    if prompt:
        kwargs["prompt"] = prompt
    return lk_openai.STT(**kwargs)


def build_silero_vad() -> silero.VAD:
    """
    Tuned for Indic speakers who have longer natural pauses:
      min_silence_duration = 1.0 s  — wait 1s of silence before end-of-turn
      prefix_padding       = 0.3 s  — keep 300 ms before speech onset
    """
    return silero.VAD.load(
        min_silence_duration    = 1.0,
        prefix_padding_duration = 0.3,
    )


# ── CART HELPERS ──────────────────────────────────────────────────────────────
def _parse_quantity(text: str, default: int = 1) -> int:
    """
    Extract the first integer from text (handles "2 notebooks", etc.).
    Falls back to `default` when no digit is found.
    """
    m = re.search(r'\b(\d{1,3})\b', text)
    return int(m.group(1)) if m else default


def _update_cart(cart: list[dict], text: str) -> list[dict]:
    """
    Scan `text` for any catalogue items using fuzzy_match_item.
    Merges new items into the existing cart (increments qty if already present).
    Returns the updated cart.
    """
    matched = fuzzy_match_item(text)
    if matched:
        qty = _parse_quantity(text)
        for entry in cart:
            if entry["id"] == matched["id"]:
                entry["qty"] += qty
                logger.info("Cart updated: %s qty → %d", matched["name"], entry["qty"])
                return cart
        cart.append({
            "id":    matched["id"],
            "name":  matched["name"],
            "price": matched["price"],
            "qty":   qty,
        })
        logger.info("Cart add: %dx %s @ ₹%d", qty, matched["name"], matched["price"])
    return cart


# ── ORDER AGENT ───────────────────────────────────────────────────────────────
class OrderAgent(Agent):
    def __init__(self, *, call_id: str, caller_number: str, tts_plugin: SarvamTTS) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)
        self.call_id       = call_id
        self.caller_number = caller_number
        self._tts_plugin   = tts_plugin
        self._start_time   = asyncio.get_event_loop().time()
        self._transcript_lines: list[str] = []
        self._detected_lang = "en"
        self._stt_plugin: Optional[lk_openai.STT] = None
        self._current_stt_lang: str = ""  # track to avoid unnecessary rebuilds

        # Live cart — updated every user turn via fuzzy_match_item
        self._cart: list[dict] = []

        # Language gate
        self._lang_retry_count    = 0
        self._lang_gate_active    = False
        self._lang_confidence_streak = 0

    # ── helpers ───────────────────────────────────────────────────────────────
    def get_response(self, intent: str) -> str:
        variants = RESPONSES.get(intent)
        if isinstance(variants, dict):
            return variants.get(self._detected_lang, variants.get("en", ""))
        return ""

    def _derive_lang(self, text: str) -> tuple[str | None, bool]:
        if _KANNADA_RE.search(text):
            return "kn", True
        if _DEVANAGARI_RE.search(text):
            if _MARATHI_WORDS_RE.search(text):
                return "mr", True
            if _HINDI_WORDS_RE.search(text):
                return "hi", True
            if self._detected_lang in ("hi", "mr"):
                return self._detected_lang, False
            return "hi", False
        text_lower = text.lower()
        if _KN_ROMAN_RE.search(text_lower):
            return "kn", True
        if _MR_ROMAN_RE.search(text_lower):
            return "mr", True
        if _HI_ROMAN_RE.search(text_lower):
            return "hi", True
        return None, False

    def _update_stt_hint(self, lang: str) -> None:
        """Update STT language hint only if the language actually changed."""
        if not (self._stt_plugin and self._session):
            return
        if lang == self._current_stt_lang:
            return  # No rebuild needed
        try:
            prompt = WHISPER_PROMPTS.get(lang, "")
            new_stt = build_groq_stt(language_hint=lang, prompt=prompt)
            self._session.stt = new_stt
            self._stt_plugin  = new_stt
            self._current_stt_lang = lang
            logger.info("Whisper hint → '%s' (with prompt steering)", lang)
        except Exception as exc:
            logger.warning("STT hint update failed: %s", exc)

    # ── user turn ─────────────────────────────────────────────────────────────
    async def on_user_turn_completed(self, chat_ctx, new_message) -> None:  # type: ignore[override]
        text = (getattr(new_message, "text_content", None) or "").strip()

        # Whisper silence hallucinations filter
        lower_text = text.lower()
        hallucinations = {
            "thank you.", "thank you", "thanks for watching.", "thanks for watching",
            "my name is .", "my name is", "bye.", "bye", "you", "you.", 
            "thank you very much.", "subscribe.", "amen."
        }
        if lower_text in hallucinations or len(lower_text) < 2:
            logger.info("Filtered STT hallucination: '%s'", text)
            return

        # ── Language resolution ───────────────────────────────────────────────
        derived_lang, high_conf = self._derive_lang(text)
        base_lang    = getattr(new_message, "detected_language", None)
        whisper_lang = base_lang[:2].lower() if base_lang else None

        if derived_lang and high_conf:
            lang = derived_lang
        elif whisper_lang:
            lang = whisper_lang
        elif derived_lang:
            lang = derived_lang
        else:
            lang = self._detected_lang

        # ── Language gate ─────────────────────────────────────────────────────
        if lang and lang not in SUPPORTED_LANGS:
            self._lang_retry_count += 1
            self._lang_gate_active  = True
            self._transcript_lines.append(
                f"[SYSTEM: unsupported lang '{lang}', attempt {self._lang_retry_count}]"
            )
            if self._lang_retry_count >= MAX_LANG_RETRIES:
                if self._session:
                    await self._session.say(UNSUPPORTED_LANG_GOODBYE, allow_interruptions=False)
                asyncio.create_task(self.disconnect_after_delay(delay=3))
            else:
                if self._session:
                    await self._session.say(UNSUPPORTED_LANG_PROMPT, allow_interruptions=True)
            return

        # ── Reset gate ────────────────────────────────────────────────────────
        self._lang_retry_count   = 0
        self._lang_gate_active   = False

        # ── Commit language switch ────────────────────────────────────────────
        word_count = len(text.split())
        if lang != self._detected_lang and (high_conf or word_count >= 3):
            logger.info("Lang: %s → %s", self._detected_lang, lang)
            self._detected_lang = lang
            self._tts_plugin.update_voice(LANGUAGE_VOICE_MAP[lang])
            self._update_stt_hint(lang)

        # ── CART UPDATE ───────────────────────────────────────────────────────
        if text:
            self._cart = _update_cart(self._cart, text)
            self._transcript_lines.append(f"Caller: {text}")
            await super().on_user_turn_completed(chat_ctx, new_message)
        else:
            if self._session:
                resp_text = self.get_response("no_speech_detected")
                self._transcript_lines.append(f"Agent: {resp_text}")
                await self._session.say(resp_text, allow_interruptions=True)

    # ── assistant turn ────────────────────────────────────────────────────────
    async def on_assistant_turn_completed(self, chat_ctx, new_message) -> None:  # type: ignore[override]
        text = (getattr(new_message, "text_content", None) or "").strip()
        if text:
            self._transcript_lines.append(f"Agent: {text}")
            farewell_signals = {
                "successfully", "धन्यवाद", "दर्ज हो गया",
                "ಧನ್ಯವಾದ", "ದಾಖಲಾಗಿದೆ", "नोंदवली गेली",
            }
            if any(sig in text for sig in farewell_signals):
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
        logger.info("Finalizing call %s (%.1fs, lang=%s, cart=%d items).",
                    self.call_id, duration, self._detected_lang, len(self._cart))
        await asyncio.gather(
            log_call_to_airtable(
                call_id=self.call_id,
                caller_number=self.caller_number,
                duration_seconds=duration,
                transcript=transcript,
                language_detected=voice_code,
            ),
            extract_and_log_order(
                call_id=self.call_id,
                transcript=transcript,
                cart=self._cart,
            ),
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
            # Caller must speak for >0.8 s to count as a barge-in (faster interrupts)
            interruption = InterruptionOptions(enabled=True, min_duration=0.8),
            # Agent waits 1.1 s of silence before replying (more space for Indic speakers)
            endpointing  = EndpointingOptions(min_delay=1.1),
        ),
    )

    agent._stt_plugin = stt_plugin
    agent._session    = session

    async def _enforce_max_duration() -> None:
        await asyncio.sleep(MAX_CALL_DURATION)
        try:
            if session.room.connection_state != rtc.ConnectionState.CONN_DISCONNECTED:
                farewell = {
                    "en": "Sorry, the maximum call duration has been reached. Goodbye!",
                    "hi": "क्षमा करें, अधिकतम कॉल अवधि समाप्त हो गई। धन्यवाद!",
                    "kn": "ಕ್ಷಮಿಸಿ, ಗರಿಷ್ಠ ಕರೆ ಅವಧಿ ತಲುಪಿದೆ. ಧನ್ಯವಾದ!",
                    "mr": "माफ करा, जास्तीत जास्त कॉल कालावधी संपला. धन्यवाद!",
                }.get(agent._detected_lang, "Sorry, max duration reached. Goodbye!")
                await session.say(farewell, allow_interruptions=False)
        finally:
            await ctx.room.disconnect()

    asyncio.ensure_future(_enforce_max_duration())

    try:
        await session.start(
            room               = ctx.room,
            agent              = agent,
            room_input_options = RoomInputOptions(),
        )
        await session.say(
            "Hello! Welcome to our store. What would you like to order today?",
            allow_interruptions=True
        )
        while ctx.room.connection_state != rtc.ConnectionState.CONN_DISCONNECTED:
            await asyncio.sleep(1)
    finally:
        await agent.finalize_call()
        await _close_session()


# ── OUTBOUND CALL HELPER ──────────────────────────────────────────────────────
async def call_customer(phone_number: str) -> str:
    room_name = f"outbound-{uuid.uuid4()}"
    api_url   = LIVEKIT_URL.replace("wss://", "https://").replace("ws://", "http://")
    lk_client = lk_api.LiveKitAPI(
        url=api_url, api_key=LIVEKIT_API_KEY, api_secret=LIVEKIT_API_SECRET
    )
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