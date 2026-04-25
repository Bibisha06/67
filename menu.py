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

def fuzzy_match_item(spoken_text: str) -> dict | None:
    spoken_lower = spoken_text.lower()
    for item in MENU["items"]:
        if item["name"].lower() in spoken_lower:
            return item
        for alias in item.get("aliases", []):
            if alias.lower() in spoken_lower:
                return item
    return None
