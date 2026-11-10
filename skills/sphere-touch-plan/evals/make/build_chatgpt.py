"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 -I skills/sphere-touch-plan/evals/make/build_chatgpt.py

Writes chatgpt/sphere-touch-plan-guide.md (references/touch-plan-guide.md with the sibling skill's name
written as plain words), chatgpt/fub-setup.md (references/fub-setup.md without "skill" wording), and copies
the shared outreach-rules.md unchanged. chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"


def main():
    guide = (SKILL / "references" / "touch-plan-guide.md").read_text(encoding="utf-8")
    guide = guide.replace("goes to `post-closing-client-care`, by name,",
                          "goes to first-year client care (a separate post-closing plan, if you use one), by name,")
    guide = guide.replace("# Touch Plan Guide", "# Sphere Touch Plan Guide", 1)

    fub = (SKILL / "references" / "fub-setup.md").read_text(encoding="utf-8")
    for old, new in [
        ("The skill never sets anything up and never writes to the CRM", "Nothing in this project sets anything up or writes to the CRM"),
        ("the agent writes each touch, and this skill drafts them", "the agent writes each touch from the drafts here"),
        ("as part of this skill", "as part of this"),
        ("(for database-health-check)", "(for another Amplified Impact tool)"),
        ("as cited in database-health-check's `fub-and-crm-exports.md`", "as cited in Amplified Impact's Follow Up Boss export notes"),
    ]:
        assert old in fub, old
        fub = fub.replace(old, new)

    for name, text in (("sphere-touch-plan-guide.md", guide), ("fub-setup.md", fub)):
        for bad in ("Claude", "SKILL.md", "references/", "skill"):
            assert bad not in text, (name, bad)
        (OUT / name).write_text(text, encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SHARED / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    print("wrote chatgpt/sphere-touch-plan-guide.md and chatgpt/fub-setup.md, copied outreach-rules.md")


if __name__ == "__main__":
    main()
