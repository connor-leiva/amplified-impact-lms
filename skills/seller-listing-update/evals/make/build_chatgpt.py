"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/seller-listing-update/evals/make/build_chatgpt.py

Writes chatgpt/seller-listing-update-guide.md (the update guide and the fair housing and feedback notes merged) and
copies utah-seller-update-notes.md (pointing to the merged guide). chatgpt/instructions.md and chatgpt/paste.txt
are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
OUT = SKILL / "chatgpt"
GUIDE = "seller-listing-update-guide.md"


def main():
    guide = (SKILL / "references" / "update-guide.md").read_text(encoding="utf-8")
    fair = (SKILL / "references" / "fair-housing-and-feedback.md").read_text(encoding="utf-8")
    utah = (SKILL / "references" / "utah-seller-update-notes.md").read_text(encoding="utf-8")

    guide = guide.replace(
        "# Seller Update Guide",
        "# Seller Listing Update Guide\n\nPart 1 is the inputs, the counting, the comparisons, the themes and the draft "
        "shapes. Part 2 is fair housing, privacy and what to do with each comment.\n\n# Part 1: Inputs, Numbers and Drafts",
        1,
    )
    guide = guide.replace("(see the fair housing reference)", "(see Part 2)")
    guide = guide.replace("Run it in code when code execution is on.", "Run it in code when data analysis is available.")
    fair = fair.replace("# Fair Housing, Privacy and Showing Feedback", "# Part 2: Fair Housing, Privacy and Showing Feedback", 1)
    merged = guide.rstrip() + "\n\n" + fair
    utah = utah.replace("Everything else follows `fair-housing-and-feedback.md`.", f"Everything else follows Part 2 of `{GUIDE}`.")
    for name, text in ((GUIDE, merged), ("utah-seller-update-notes.md", utah)):
        for bad in ("Claude", "SKILL.md", "references/", "fair-housing-and-feedback.md", "`update-guide.md`", "code execution"):
            assert bad not in text, (name, bad)

    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(merged, encoding="utf-8")
    (OUT / "utah-seller-update-notes.md").write_text(utah, encoding="utf-8")
    print(f"wrote chatgpt/{GUIDE} and chatgpt/utah-seller-update-notes.md")


if __name__ == "__main__":
    main()
