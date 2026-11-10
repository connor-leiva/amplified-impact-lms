"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/market-update-email/evals/make/build_chatgpt.py

Copies references/market-math.md unchanged, writes chatgpt/market-update-writing.md (the writing guide and the
Utah notes merged, with the voice-skill mention dropped) and copies the shared outreach-rules.md unchanged.
chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"


def main():
    math = (SKILL / "references" / "market-math.md").read_text(encoding="utf-8")
    guide = (SKILL / "references" / "writing-guide.md").read_text(encoding="utf-8")
    utah = (SKILL / "references" / "utah-market-update-rules.md").read_text(encoding="utf-8")

    guide = guide.replace(", their preferences, or a voice skill)", ", or their preferences)")
    guide = guide.replace("(see `utah-market-update-rules.md`)", "(see Part 2 of this file)")
    guide = guide.replace("see the state notes when they apply", "see Part 2 of this file for Utah")
    guide = guide.replace("# Writing the Market Update: Email, Post and Language Rules",
                          "# Market Update Writing Guide\n\nPart 1 is how to write the email and the post. Part 2 is the Utah advertising and MLS rules.\n\n"
                          "# Part 1: Writing the Market Update: Email, Post and Language Rules", 1)
    utah = utah.replace("# Utah: Advertising and MLS Rules for a Market Update",
                        "# Part 2: Utah Advertising and MLS Rules for a Market Update", 1)
    merged = guide.rstrip() + "\n\n" + utah
    for text in (math, merged):
        for bad in ("Claude", "SKILL.md", "references/"):
            assert bad not in text, bad

    OUT.mkdir(exist_ok=True)
    (OUT / "market-math.md").write_text(math, encoding="utf-8")
    (OUT / "market-update-writing.md").write_text(merged, encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SHARED / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    print("wrote chatgpt/market-math.md, chatgpt/market-update-writing.md and chatgpt/outreach-rules.md")


if __name__ == "__main__":
    main()
