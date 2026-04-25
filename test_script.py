"""
test_script.py — Unit tests for fuzzy matching.
"""
import time
from menu import fuzzy_match_item, get_menu_summary


def test_exact_match():
    """Exact substring match should work."""
    assert fuzzy_match_item("I want a pencil")["name"] == "Pencil"
    assert fuzzy_match_item("notebook please")["name"] == "Notebook"
    assert fuzzy_match_item("give me a stapler")["name"] == "Stapler"
    assert fuzzy_match_item("I need scissors")["name"] == "Scissors"
    assert fuzzy_match_item("one highlighter")["name"] == "Highlighter"
    print("✅ test_exact_match passed")


def test_alias_match():
    """Aliases in Indic scripts should match."""
    assert fuzzy_match_item("मुझे पेंसिल चाहिए")["name"] == "Pencil"
    assert fuzzy_match_item("ನನಗೆ ಪೆನ್ ಬೇಕು")["name"] == "Ballpoint Pen"
    assert fuzzy_match_item("मला कात्री पाहिजे")["name"] == "Scissors"
    assert fuzzy_match_item("मला नोटवही पाहिजे")["name"] == "Notebook"
    assert fuzzy_match_item("ನನಗೆ ರಬ್ಬರ್ ಬೇಕು")["name"] == "Eraser"
    print("✅ test_alias_match passed")


def test_fuzzy_match_mishearings():
    """Whisper often mishears English words — fuzzy match should catch common typos."""
    # "notbok" (mishearing of "notebook")
    result = fuzzy_match_item("give me a notbok")
    assert result is not None, "notbok should fuzzy-match something"
    print(f"   notbok → {result['name']}")

    # "staplar" (mishearing of "stapler")
    result = fuzzy_match_item("I need a staplar")
    assert result is not None, "staplar should fuzzy-match something"
    print(f"   staplar → {result['name']}")

    print("✅ test_fuzzy_match_mishearings passed")


def test_no_false_positives():
    """Short unrelated words should NOT match."""
    assert fuzzy_match_item("hi") is None
    assert fuzzy_match_item("yes ok") is None
    assert fuzzy_match_item("thank you") is None
    print("✅ test_no_false_positives passed")


def test_menu_summary():
    """Menu summary should include all items."""
    summary = get_menu_summary()
    assert "Ballpoint Pen" in summary
    assert "₹10" in summary
    assert "Notebook" in summary
    print("✅ test_menu_summary passed")


def test_performance():
    """Fuzzy matching should complete quickly — under 50ms per call."""
    start = time.time()
    for _ in range(100):
        fuzzy_match_item("I want notbok and staplar please")
    elapsed = time.time() - start
    per_call = (elapsed / 100) * 1000
    print(f"✅ test_performance passed ({per_call:.1f} ms/call)")
    assert per_call < 50, f"Too slow: {per_call:.1f} ms/call"


if __name__ == "__main__":
    test_exact_match()
    test_alias_match()
    test_fuzzy_match_mishearings()
    test_no_false_positives()
    test_menu_summary()
    test_performance()
    print("\n🎉 All tests passed!")
