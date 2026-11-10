"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/open-house-follow-up/evals/make/build_chatgpt.py

Writes chatgpt/open-house-follow-up-guide.md (the open house guide and the fair housing and representation notes
merged, with the Claude upload source dropped), and copies utah-open-house-notes.md (pointing to the merged guide)
and the shared outreach-rules.md. chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"
GUIDE = "open-house-follow-up-guide.md"


def main():
    guide = (SKILL / "references" / "open-house-guide.md").read_text(encoding="utf-8")
    fair = (SKILL / "references" / "fair-housing-and-representation.md").read_text(encoding="utf-8")
    utah = (SKILL / "references" / "utah-open-house-notes.md").read_text(encoding="utf-8")

    guide = "\n".join(l for l in guide.splitlines() if not l.startswith("- Claude Help Center")) + "\n"
    guide = guide.replace("Tool facts (Curb Hero, Google Forms, file uploads)", "Tool facts (Curb Hero, Google Forms)")
    guide = guide.replace(
        "# Open House Guide",
        "# Open House Follow-Up Guide\n\nPart 1 is the sign-in sheet, the sorting, the counts, the dates and the draft shapes. "
        "Part 2 is fair housing, privacy and visitors who have an agent.\n\n# Part 1: Sheets, Sorting and Drafts",
        1,
    )
    fair = fair.replace("# Fair Housing, Privacy and Represented Visitors", "# Part 2: Fair Housing, Privacy and Represented Visitors", 1)
    merged = guide.rstrip() + "\n\n" + fair
    utah = utah.replace("See `fair-housing-and-representation.md`.", f"See Part 2 of `{GUIDE}`.")
    for name, text in ((GUIDE, merged), ("utah-open-house-notes.md", utah)):
        for bad in ("Claude", "SKILL.md", "references/", "fair-housing-and-representation.md"):
            assert bad not in text, (name, bad)

    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(merged, encoding="utf-8")
    (OUT / "utah-open-house-notes.md").write_text(utah, encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SHARED / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"wrote chatgpt/{GUIDE} and chatgpt/utah-open-house-notes.md, and copied outreach-rules.md")


if __name__ == "__main__":
    main()
