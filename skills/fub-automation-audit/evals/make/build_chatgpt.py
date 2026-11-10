"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/fub-automation-audit/evals/make/build_chatgpt.py

Writes chatgpt/fub-automation-audit-guide.md (fub-inputs.md as Part 1 and audit-rules.md as Part 2, with every pointer
between them rewritten), and copies utah-texting-notes.md (pointing to the merged guide) and the shared
outreach-rules.md. chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"
GUIDE = "fub-automation-audit-guide.md"


def main():
    inputs = (SKILL / "references" / "fub-inputs.md").read_text(encoding="utf-8")
    rules = (SKILL / "references" / "audit-rules.md").read_text(encoding="utf-8")
    utah = (SKILL / "references" / "utah-texting-notes.md").read_text(encoding="utf-8")

    inputs = inputs.replace(
        "# Follow Up Boss: Where the Inputs Come From and How FUB Runs Them",
        "# FUB Automation Audit Guide\n\nPart 1 is where each input comes from in Follow Up Boss and how Follow Up Boss runs "
        "plans and texts. Part 2 is the audit rules: reading the inputs, the inventory, gaps, overlaps, the texting-consent "
        "check, template wording, the fix list and Check Before Sending.\n\n"
        "# Part 1: Where the Inputs Come From and How Follow Up Boss Runs Them",
        1,
    )
    rules = rules.replace("# Audit Rules", "# Part 2: Audit Rules", 1)
    rules = rules.replace(
        "Follow Up Boss facts (timing, send times, what triggers what) are in `fub-inputs.md`;",
        "Follow Up Boss facts (timing, send times, what triggers what) are in Part 1;",
    )
    rules = rules.replace("(`fub-inputs.md`)", "(Part 1)").replace("`fub-inputs.md`", "Part 1")
    rules = rules.replace("`utah-texting-notes.md`", "`utah-texting-notes.md` (Utah only)")
    merged = inputs.rstrip() + "\n\n" + rules
    utah = utah.replace("(`fub-inputs.md`)", f"(Part 1 of `{GUIDE}`)").replace("`fub-inputs.md`", f"Part 1 of `{GUIDE}`")

    for name, text in ((GUIDE, merged), ("utah-texting-notes.md", utah)):
        for bad in ("Claude", "SKILL.md", "references/", "fub-inputs.md", "audit-rules.md"):
            assert bad not in text, (name, bad)

    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(merged, encoding="utf-8")
    (OUT / "utah-texting-notes.md").write_text(utah, encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SHARED / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    print(f"wrote chatgpt/{GUIDE} and chatgpt/utah-texting-notes.md, and copied outreach-rules.md")


if __name__ == "__main__":
    main()
