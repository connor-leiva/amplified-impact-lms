"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/appointment-follow-up/evals/make/build_chatgpt.py

Writes chatgpt/appointment-follow-up-guide.md (the follow-up guide and the fair housing and privacy notes merged,
with the Claude connector row dropped) and copies the two shared references unchanged. chatgpt/instructions.md and
chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"


def main():
    guide = (SKILL / "references" / "follow-up-guide.md").read_text(encoding="utf-8")
    fair = (SKILL / "references" / "fair-housing-and-privacy.md").read_text(encoding="utf-8")

    lines = [l for l in guide.splitlines() if not l.startswith("| Granola connector in Claude")]
    guide = "\n".join(lines) + "\n"
    guide = guide.replace("# Follow-Up Guide", "# Appointment Follow-Up Guide", 1)
    guide = guide.replace("the leave-out lists in `fair-housing-and-privacy.md`", "the leave-out lists in Part 2 of this file")
    guide = guide.replace("see `buyer-agreements.md`", "see buyer-agreements.md")
    guide = guide.replace("`pricing-conversation-prep`", "a pricing prep tool, if you use one,")
    guide = guide.replace("a suggestion to run a pricing prep tool, if you use one, on the CMA first",
                          "a suggestion to prepare the price conversation from the CMA first")
    fair = fair.replace("# Fair Housing and Privacy in Follow-Ups", "# Part 2: Fair Housing and Privacy in Follow-Ups", 1)

    merged = guide.replace("# Appointment Follow-Up Guide", "# Appointment Follow-Up Guide\n\nPart 1 is how to read a transcript and what to pull from it. Part 2 is fair housing and privacy.\n\n# Part 1: Reading the Transcript and Writing the Follow-Up", 1)
    merged = merged.rstrip() + "\n\n" + fair
    for bad in ("Claude", "SKILL.md", "references/"):
        assert bad not in merged, bad

    OUT.mkdir(exist_ok=True)
    (OUT / "appointment-follow-up-guide.md").write_text(merged, encoding="utf-8")
    for name in ("buyer-agreements.md", "utah-property-notes.md"):
        (OUT / name).write_text((SHARED / name).read_text(encoding="utf-8"), encoding="utf-8")
    print("wrote chatgpt/appointment-follow-up-guide.md and copied the shared references")


if __name__ == "__main__":
    main()
