"""Build the ChatGPT Project files that copy the Claude skill's references, so the two never drift.

- chatgpt/analysis-code.md      a copy of references/analysis-code.md
- chatgpt/outreach-rules.md     a copy of skills/_shared/outreach-rules.md
- chatgpt/health-check-guide.md fub-and-crm-exports.md, health-rules.md and nurture-drafts.md in one file
chatgpt/instructions.md and chatgpt/paste.txt are written by hand.

Usage: python3 -I evals/make/build_chatgpt.py
"""
import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
REF = SKILL / "references"
OUT = SKILL / "chatgpt"


def demote(md):
    """One level down for every heading, so each source becomes a section of the guide."""
    return re.sub(r"^(#+) ", lambda m: "#" + m.group(1) + " ", md, flags=re.M)


def main():
    OUT.mkdir(exist_ok=True)
    (OUT / "analysis-code.md").write_text((REF / "analysis-code.md").read_text(encoding="utf-8"), encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SKILL.parent / "_shared" / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    parts = []
    for name in ("fub-and-crm-exports.md", "health-rules.md", "nurture-drafts.md"):
        parts.append(demote((REF / name).read_text(encoding="utf-8")).strip())
    guide = ("# Database Health Check Guide\n\nThree parts: Follow Up Boss and other CRM exports; the health rules (checks, team rules, "
             "segments, worklist); and how to write the nurture drafts. Consent and opt-out rules are in outreach-rules.md.\n\n"
             + "\n\n".join(parts) + "\n")
    guide = guide.replace("fub-and-crm-exports.md", "the exports part of this guide")
    guide = guide.replace("Read outreach-rules.md too", "Read outreach-rules.md too")
    (OUT / "health-check-guide.md").write_text(guide, encoding="utf-8")
    for f in sorted(OUT.iterdir()):
        print(f.name, f.stat().st_size)


if __name__ == "__main__":
    main()
