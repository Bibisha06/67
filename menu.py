"""
menu.py — Product catalogue + optimized fuzzy matching.

Uses a fast two-pass approach:
  1. Exact substring match (sorted longest-first to prefer specific aliases)
  2. Character-set overlap for Whisper mishearings (very fast, no SequenceMatcher)
"""

MENU = {
    "items": [
        {"id": "S01", "name": "Ballpoint Pen",      "aliases": ["pen", "ball pen", "बॉलपेन", "पेन", "ಬಾಲ್ ಪೆನ್", "ಪೆನ್", "बॉलपेन", "पेन"],                          "price": 10},
        {"id": "S02", "name": "Pencil",             "aliases": ["pencil", "पेंसिल", "ಪೆನ್ಸಿಲ್", "पेन्सिल"],                                                           "price": 5},
        {"id": "S03", "name": "Eraser",             "aliases": ["rubber", "eraser", "रबर", "ರಬ್ಬರ್", "खोडरबर"],                                                        "price": 5},
        {"id": "S04", "name": "Sharpener",          "aliases": ["sharpener", "शार्पनर", "ಶಾರ್ಪನರ್", "शार्पनर"],                                                        "price": 8},
        {"id": "S05", "name": "Notebook",           "aliases": ["notebook", "copy", "नोटबुक", "कॉपी", "ನೋಟ್ಬುಕ್", "ನಕಲು", "वही", "नोटवही"],                          "price": 40},
        {"id": "S06", "name": "Ruled Notebook",     "aliases": ["ruled", "lined notebook", "ruled copy", "लाइनवाली कॉपी", "ರೂಲ್ಡ್ ನೋಟ್ಬುಕ್", "ओळींची वही"],        "price": 45},
        {"id": "S07", "name": "Graph Notebook",     "aliases": ["graph", "graph copy", "ग्राफ कॉपी", "ಗ್ರಾಫ್ ನೋಟ್ಬುಕ್", "आलेख वही"],                               "price": 50},
        {"id": "S08", "name": "A4 Paper Ream",      "aliases": ["a4", "paper", "a4 paper", "printing paper", "A4 कागज", "ಎ4 ಪೇಪರ್", "A4 कागद"],                       "price": 250},
        {"id": "S09", "name": "Stapler",            "aliases": ["stapler", "स्टेपलर", "ಸ್ಟೇಪ್ಲರ್", "स्टेपलर"],                                                         "price": 120},
        {"id": "S10", "name": "Stapler Pins",       "aliases": ["stapler pins", "pins", "refill", "स्टेपल पिन", "ಸ್ಟೇಪಲ್ ಪಿನ್", "स्टेपल पिना"],                      "price": 20},
        {"id": "S11", "name": "Scissors",           "aliases": ["scissors", "कैंची", "ಕತ್ತರಿ", "कात्री"],                                                               "price": 35},
        {"id": "S12", "name": "Glue Stick",         "aliases": ["glue", "gum", "glue stick", "गोंद", "ಅಂಟು", "डिंक", "खळ"],                                           "price": 30},
        {"id": "S13", "name": "Whitener",           "aliases": ["whitener", "correction pen", "white ink", "व्हाइटनर", "ವೈಟನರ್", "व्हाइटनर"],                         "price": 25},
        {"id": "S14", "name": "Highlighter",        "aliases": ["highlighter", "highlight pen", "हाइलाइटर", "ಹೈಲೈಟರ್", "हायलायटर"],                                   "price": 40},
        {"id": "S15", "name": "Marker Pen",         "aliases": ["marker", "sketch pen", "मार्कर", "ಮಾರ್ಕರ್", "मार्कर"],                                            "price": 30},
        {"id": "S16", "name": "Geometry Box",       "aliases": ["geometry box", "geo box", "compass box", "जियोमेट्री बॉक्स", "ಜ್ಯಾಮಿತಿ ಬಾಕ್ಸ್", "भूमिती बॉक्स"],   "price": 120},
        {"id": "S17", "name": "Scale / Ruler",      "aliases": ["scale", "ruler", "स्केल", "रूलर", "ಸ್ಕೇಲ್", "स्केल"],                                                "price": 10},
        {"id": "S18", "name": "Sticky Notes",       "aliases": ["sticky notes", "post it", "post-it", "चिपकू पर्ची", "ಸ್ಟಿಕಿ ನೋಟ್ಸ್", "चिकट चिठ्ठ्या"],             "price": 50},
        {"id": "S19", "name": "File Folder",        "aliases": ["folder", "file", "फाइल", "ಫೈಲ್", "फाईल"],                                                             "price": 20},
        {"id": "S20", "name": "Tape / Cello Tape",  "aliases": ["tape", "cello tape", "sellotape", "टेप", "ಟೇಪ್", "टेप", "सेलोटेप"],                                  "price": 25},
    ]
}

# ── Pre-built index: sorted longest-first so specific aliases win ─────────
_ALIAS_INDEX: list[tuple[str, dict]] = []
for _item in MENU["items"]:
    _ALIAS_INDEX.append((_item["name"].lower(), _item))
    for _alias in _item.get("aliases", []):
        _ALIAS_INDEX.append((_alias.lower(), _item))
_ALIAS_INDEX.sort(key=lambda x: len(x[0]), reverse=True)

# Only aliases >= 4 chars participate in fuzzy matching (avoid "pen", "gum" etc.)
_FUZZY_ALIASES: list[tuple[str, set, dict]] = []
for _alias_str, _item in _ALIAS_INDEX:
    if len(_alias_str) >= 4:
        _FUZZY_ALIASES.append((_alias_str, set(_alias_str), _item))

_FUZZY_THRESHOLD = 0.70  # character overlap ratio


def _char_overlap(a: str, b_set: set, b_len: int) -> float:
    """Fast character-level overlap ratio. O(len(a))."""
    if not a or b_len == 0:
        return 0.0
    common = sum(1 for c in a if c in b_set)
    return (2.0 * common) / (len(a) + b_len)


def fuzzy_match_item(spoken_text: str) -> dict | None:
    """
    Two-pass matching:
      1. Exact substring match (fast path).
      2. Character-overlap fuzzy match for Whisper mishearings.
    """
    spoken_lower = spoken_text.lower()

    # ── Pass 1: exact substring (longest alias first) ─────────────────────
    for alias, item in _ALIAS_INDEX:
        if alias in spoken_lower:
            return item

    # ── Pass 2: character overlap on words & bigrams ──────────────────────
    words = spoken_lower.split()
    candidates: list[str] = [w for w in words if len(w) >= 4]
    for i in range(len(words) - 1):
        bigram = f"{words[i]} {words[i+1]}"
        if len(bigram) >= 4:
            candidates.append(bigram)

    if not candidates:
        return None

    best_score = 0.0
    best_item = None

    for candidate in candidates:
        cand_len = len(candidate)
        for alias_str, alias_set, item in _FUZZY_ALIASES:
            alias_len = len(alias_str)
            # Length guard: skip if vastly different sizes
            if abs(cand_len - alias_len) > max(cand_len, alias_len) * 0.5:
                continue
            score = _char_overlap(candidate, alias_set, alias_len)
            if score > best_score and score >= _FUZZY_THRESHOLD:
                best_score = score
                best_item = item
                if score >= 0.95:
                    return best_item

    return best_item


def get_menu_summary() -> str:
    """Returns a formatted catalogue string for the LLM system prompt."""
    lines = []
    for item in MENU["items"]:
        lines.append(f"• {item['name']} — ₹{item['price']}")
    return "\n".join(lines)
