"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 -I skills/agent-1on1-prep/evals/make/build_chatgpt.py

Writes chatgpt/agent-1on1-prep-guide.md (prep-rules.md and exports.md merged, in that order) and
chatgpt/agent-1on1-prep-code.md (prep-code.md with its file names pointed at the guide). chatgpt/instructions.md and
chatgpt/paste.txt are written by hand.
"""
import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
REF = SKILL / "references"
OUT = SKILL / "chatgpt"
GUIDE = "agent-1on1-prep-guide.md"
CODE = "agent-1on1-prep-code.md"


def demote(md, title):
    """The file's own H1 becomes this part's heading; every other heading moves down one level."""
    lines = md.strip().splitlines()
    assert lines[0].startswith("# ")
    body = "\n".join(lines[1:])
    body = re.sub(r"^(#{2,5}) ", lambda m: "#" + m.group(1) + " ", body, flags=re.M)
    return f"## {title}\n{body}\n"


def point(md, where):
    """File names become parts of the guide: "of this guide" inside it, the guide's name elsewhere."""
    for name, n in (("`prep-rules.md`", 1), ("`exports.md`", 2)):
        md = md.replace(name, f"Part {n} of {where}")
    return md


def unskill(md):
    """The ChatGPT version is a Project, not a skill."""
    for a, b in (("This skill's", "This project's"), ("this skill's", "this project's"), ("This skill", "This project"),
                 ("this skill", "this project"), ("The skill's", "The prep's"), ("the skill's", "the prep's"),
                 ("The skill", "The prep"), ("the skill", "the prep")):
        md = md.replace(a, b)
    return md


def main():
    parts = [
        demote(unskill(point((REF / "prep-rules.md").read_text(encoding="utf-8"), "this guide")), "Part 1: Prep Rules"),
        demote(unskill(point((REF / "exports.md").read_text(encoding="utf-8"), "this guide")),
               "Part 2: Where the Numbers Come From, and What Sisu and Follow Up Boss Already Show"),
    ]
    guide = ("# Agent 1:1 Prep Guide\n\nPart 1 is how to build the prep: settings, goals, the pace math, what changed, "
             "commitments, privacy, questions, focus areas, the agenda, the recap and the checks. Part 2 is where the "
             "agent's numbers and goals come from, the Sisu terms behind them, and what Sisu and Follow Up Boss already "
             "show.\n\n" + "\n".join(parts))
    code = unskill(point((REF / "prep-code.md").read_text(encoding="utf-8"), "`" + GUIDE + "`"))
    for text in (guide, code):
        for bad in ("Claude", "SKILL.md", "references/", "skill"):
            assert bad not in text, bad
    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(guide, encoding="utf-8")
    (OUT / CODE).write_text(code, encoding="utf-8")
    print("wrote chatgpt/" + GUIDE + " and chatgpt/" + CODE)


if __name__ == "__main__":
    main()
