"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/expired-fsbo-outreach/evals/make/build_chatgpt.py

Writes chatgpt/expired-fsbo-outreach-guide.md (the expired and FSBO guide and the ethics and fair housing notes
merged), and copies utah-calling-rules.md (pointing to the merged guide) and the shared outreach-rules.md.
chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"
GUIDE = "expired-fsbo-outreach-guide.md"


def main():
    guide = (SKILL / "references" / "expired-fsbo-guide.md").read_text(encoding="utf-8")
    ethics = (SKILL / "references" / "ethics-and-fair-housing.md").read_text(encoding="utf-8")
    utah = (SKILL / "references" / "utah-calling-rules.md").read_text(encoding="utf-8")

    guide = guide.replace("Ethics and fair housing are in `ethics-and-fair-housing.md`.", "Ethics and fair housing are in Part 2 below.")
    guide = guide.replace(
        "# Expired and FSBO Guide",
        "# Expired and FSBO Outreach Guide\n\nPart 1 is the list: where it comes from, the columns, who may be solicited, the channels, the sort, "
        "the draft shapes and the touch plan. Part 2 is ethics, fair housing and privacy.\n\n# Part 1: The List, the Channels and the Drafts",
        1,
    )
    ethics = ethics.replace("# Ethics, Fair Housing and Privacy for Expired and FSBO Outreach",
                            "# Part 2: Ethics, Fair Housing and Privacy", 1)
    ethics = ethics.replace("(see the guide's status table)", "(see the status table in Part 1)")
    merged = guide.rstrip() + "\n\n" + ethics
    utah = utah.replace("`outreach-rules.md`", "`outreach-rules.md`")
    for name, text in ((GUIDE, merged), ("utah-calling-rules.md", utah)):
        for bad in ("Claude", "SKILL.md", "references/", "ethics-and-fair-housing.md", "expired-fsbo-guide.md"):
            assert bad not in text, (name, bad)

    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(merged, encoding="utf-8")
    (OUT / "utah-calling-rules.md").write_text(utah, encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SHARED / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"wrote chatgpt/{GUIDE} and chatgpt/utah-calling-rules.md, and copied outreach-rules.md")


if __name__ == "__main__":
    main()
