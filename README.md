# Automaton AI Infosystem — Voice Agent

Self-hosted inbound + outbound phone agent using LiveKit Agents.  
Speaks to customers in **English, Hindi, Kannada, and Marathi**,  
collects order details, and logs everything to Airtable.

---

## Architecture

```
Caller (Twilio SIP)
       │
  LiveKit Cloud  ◄──► agent.py (runs locally)
       │                 │
       │          ┌──────┴───────────┐
       │          ▼                  ▼
       │     Groq Whisper       Sarvam AI TTS
       │     (STT + lang       (multilingual
       │      detection)        Indian voices)
       │          │
       │          ▼
       │     Groq LLaMA
       │     (llama-3.3-70b)
       │
  After call ends:
       ├── call_logs → Airtable
       └── orders    → Airtable (Groq extracts structured data)
```

---

## Environment Variables

| Variable | Description | Where to get it |
|---|---|---|
| `LIVEKIT_URL` | WebSocket URL of your LiveKit Cloud project | LiveKit Cloud → Project Settings |
| `LIVEKIT_API_KEY` | LiveKit API key | LiveKit Cloud → Project Settings |
| `LIVEKIT_API_SECRET` | LiveKit API secret | LiveKit Cloud → Project Settings |
| `LIVEKIT_SIP_TRUNK_ID` | SIP trunk ID for outbound PSTN calling | LiveKit Cloud → SIP → Trunks |
| `GROQ_API_KEY` | Groq API key (used for both Whisper STT and LLaMA LLM) | https://console.groq.com |
| `SARVAM_API_KEY` | Sarvam AI API key for multilingual TTS | https://dashboard.sarvam.ai |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | https://console.twilio.com |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | https://console.twilio.com |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number in E.164 format | https://console.twilio.com |
| `AIRTABLE_PAT` | Airtable Personal Access Token (read+write scopes) | Airtable → Account → Developer Hub |
| `AIRTABLE_BASE_ID` | ID of your Airtable base (starts with `app`) | Airtable base URL |
| `MAX_CALL_DURATION_SECONDS` | Auto-disconnect after this many seconds (default: 300) | Set in `.env` |
| `AGENT_SYSTEM_PROMPT` | Full system prompt for the agent — edit to change behaviour | Set in `.env` |

---

## Quick Start

### 1. Clone and install dependencies
```bash
cd /path/to/project
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Run locally
```bash
python agent.py dev
```

> **Why local running works**: LiveKit Cloud handles all media routing and SIP bridging. Your laptop only needs an outbound internet connection — no ports need to be opened. This is production-ready for demos.

---

## Full Setup Checklist

### ☐ LiveKit Cloud
1. Create an account at https://cloud.livekit.io
2. Create a project. Copy **Project URL**, **API Key**, and **API Secret** → `.env`
3. Enable **SIP** in the project settings
4. **Inbound trunk**: LiveKit Cloud → SIP → Trunks → New Inbound Trunk
   - Set allowed IPs to Twilio's SIP signalling IPs
5. **Outbound trunk**: LiveKit Cloud → SIP → Trunks → New Outbound Trunk
   - Use `pstn.twilio.com` as the destination
   - Set auth credentials matching your Twilio SIP credential list
   - Copy the trunk ID (`ST_…`) → `LIVEKIT_SIP_TRUNK_ID` in `.env`

### ☐ Twilio
1. Create an account at https://console.twilio.com
2. Buy a phone number capable of voice → `.env` as `TWILIO_PHONE_NUMBER`
3. **Inbound SIP**: Elastic SIP Trunking → Create trunk
   - Set the **Origination SIP URI** to your LiveKit SIP inbound endpoint
   - Assign your Twilio number to this trunk
4. **Outbound SIP credential list**: SIP → Credential Lists → Create
   - Add username + password matching what you set in the LiveKit outbound trunk
5. Copy Account SID and Auth Token → `.env`

### ☐ Groq
1. Create an account at https://console.groq.com
2. Generate an API key → `GROQ_API_KEY` in `.env`
3. No separate key needed — one key handles both Whisper STT and LLaMA LLM

### ☐ Sarvam AI
1. Create an account at https://dashboard.sarvam.ai
2. Generate an API key → `SARVAM_API_KEY` in `.env`

### ☐ Airtable
1. Create a base at https://airtable.com
2. Create table **`call_logs`** with these exact fields:

   | Field | Type |
   |---|---|
   | call_id | Single line text |
   | caller_number | Single line text |
   | duration_seconds | Number |
   | transcript | Long text |
   | language_detected | Single line text |
   | created_at | Date (enable time toggle) |

3. Create table **`orders`** with these exact fields:

   | Field | Type |
   |---|---|
   | call_id | Single line text |
   | customer_name | Single line text |
   | item_ordered | Single line text |
   | quantity | Number |
   | delivery_address | Single line text |
   | order_status | Single line text |
   | created_at | Date (enable time toggle) |

4. Go to **Account → Developer Hub → Personal Access Tokens**
   - Create a token with `data.records:read` and `data.records:write` scopes on your base
   - Copy it → `AIRTABLE_PAT` in `.env`
5. Copy the Base ID from the URL (`https://airtable.com/appXXX/…`) → `AIRTABLE_BASE_ID`

---

## Making Outbound Calls (Programmatic)

```python
import asyncio
from agent import call_customer

asyncio.run(call_customer("+919876543210"))
```

---

## Where to Find Key Configuration

| What | Location in code |
|---|---|
| Language → voice code mapping | `LANGUAGE_VOICE_MAP` dict (~line 65) |
| VAD sensitivity tuning | `build_silero_vad()` with inline comments |
| System prompt (default) | `DEFAULT_PROMPT` constant |
| Airtable table names | `log_call_to_airtable()` and `extract_and_log_order()` |
| Sarvam voice speaker | `SarvamChunkedStream._run()` → `"speaker"` key |

---

## Security Notes

- `.env` is git-ignored. **Never commit it.**
- All credentials come exclusively from environment variables.
- `MAX_CALL_DURATION_SECONDS` limits cost exposure from stuck calls.
