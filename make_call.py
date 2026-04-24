"""
make_call.py — Trigger an outbound call to a customer.

Usage:
    python make_call.py +919606214389

The agent worker (python agent.py dev) must be running in another terminal
before you run this script.
"""

import asyncio
import sys
from dotenv import load_dotenv

load_dotenv()

from agent import call_customer   # noqa: E402


async def main():
    if len(sys.argv) < 2:
        print("Usage: python make_call.py <phone_number>")
        print("Example: python make_call.py +919606214389")
        sys.exit(1)

    number = sys.argv[1]
    # Ensure E.164 format — strip spaces if any
    number = number.strip().replace(" ", "")

    print(f"Dialing {number} ...")
    room_name = await call_customer(number)
    print(f"✅ Outbound call dispatched! LiveKit room: {room_name}")
    print("The agent will handle the conversation once the customer picks up.")


if __name__ == "__main__":
    asyncio.run(main())
