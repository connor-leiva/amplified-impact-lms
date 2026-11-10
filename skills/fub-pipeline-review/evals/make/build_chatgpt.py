"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 -I skills/fub-pipeline-review/evals/make/build_chatgpt.py

Writes chatgpt/fub-pipeline-review-guide.md (review-rules.md and fub-exports.md merged, in that order) and
chatgpt/fub-pipeline-code.md (pipeline-code.md with its file names pointed at the guide). chatgpt/instructions.md and
chatgpt/paste.txt are written by hand.
"""
import re
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
REF = SKILL / "references"
OUT = SKILL / "chatgpt"
GUIDE = "fub-pipeline-review-guide.md"


def demote(md, title):
    """The file's own H1 becomes this part's heading; every other heading moves down one level."""
    lines = md.strip().splitlines()
    assert lines[0].startswith("# ")
    body = "\n".join(lines[1:])
    body = re.sub(r"^(#{2,5}) ", lambda m: "#" + m.group(1) + " ", body, flags=re.M)
    return f"## {title}\n{body}\n"


def point(md, where):
    """File names become parts of the guide: "of this guide" inside it, the guide's name elsewhere."""
    md = md.replace("`review-rules.md` (Settings)", f"Part 1 of {where} (Settings)")
    for name, n in (("`review-rules.md`", 1), ("`fub-exports.md`", 2)):
        md = md.replace(name, f"Part {n} of {where}")
    return md


def unskill(md):
    """The ChatGPT version is a Project, not a skill."""
    for a, b in (("This skill's", "This project's"), ("this skill's", "this project's"), ("This skill", "This project"),
                 ("this skill", "this project"), ("The skill's", "The review's"), ("the skill's", "the review's"),
                 ("The skill", "The review"), ("the skill", "the review")):
        md = md.replace(a, b)
    return md


def main():
    parts = [
        demote(unskill(point((REF / "review-rules.md").read_text(encoding="utf-8"), "this guide")), "Part 1: Review Rules"),
        demote(unskill(point((REF / "fub-exports.md").read_text(encoding="utf-8"), "this guide")),
               "Part 2: Follow Up Boss Exports, and What Follow Up Boss and Sisu Already Show"),
    ]
    guide = ("# FUB Pipeline Review Guide\n\nPart 1 is how to read the exports and build the review. Part 2 is where each "
             "export comes from, what its columns mean, and what Follow Up Boss Reporting and Sisu already show.\n\n"
             + "\n".join(parts))
    code = point((REF / "pipeline-code.md").read_text(encoding="utf-8"), "`" + GUIDE + "`")
    for text in (guide, code):
        for bad in ("Claude", "SKILL.md", "references/", "skill"):
            assert bad not in text, bad
    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(guide, encoding="utf-8")
    (OUT / "fub-pipeline-code.md").write_text(code, encoding="utf-8")
    print("wrote chatgpt/" + GUIDE + " and chatgpt/fub-pipeline-code.md")


if __name__ == "__main__":
    main()
