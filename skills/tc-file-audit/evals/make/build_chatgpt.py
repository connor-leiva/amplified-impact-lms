#!/usr/bin/env python3
"""Build the ChatGPT Project files from the skill's references, so the two versions never drift.

  python3 -I skills/tc-file-audit/evals/make/build_chatgpt.py skills/tc-file-audit

Writes chatgpt/tc-file-audit-guide.md (file-exports.md as Part 1, audit-rules.md as Part 2),
chatgpt/utah-repc-deadlines.md and chatgpt/deadline-code.md. chatgpt/instructions.md and chatgpt/paste.txt
are written by hand.
"""
import re
import sys
from pathlib import Path

NAMES = [
    ("`references/utah-repc-deadlines.md`", "`utah-repc-deadlines.md`"),
    ("`references/deadline-code.md`", "`deadline-code.md`"),
    ("`references/audit-rules.md`, section 3", "Part 2, section 3, of `tc-file-audit-guide.md`"),
    ("`references/audit-rules.md`", "Part 2 of `tc-file-audit-guide.md`"),
    ("`references/file-exports.md`", "Part 1 of `tc-file-audit-guide.md`"),
]


def swap(text):
    for a, b in NAMES:
        text = text.replace(a, b)
    return text


def main():
    skill = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    ref, out = skill / "references", skill / "chatgpt"

    exports = swap((ref / "file-exports.md").read_text(encoding="utf-8"))
    exports = exports.replace("# Where Each Input Comes From", "## Part 1: Where Each Input Comes From", 1)
    exports = re.sub(r"^## (?!Part)", "### ", exports, flags=re.M)
    rules = swap((ref / "audit-rules.md").read_text(encoding="utf-8"))
    rules = rules.replace("# Audit Rules", "## Part 2: Audit Rules", 1)
    rules = re.sub(r"^## (?!Part)", "### ", rules, flags=re.M)
    rules = rules.replace("Write `/tmp/tc/file.json`", "Write `file.json`")
    guide = ("# TC File Audit: Guide\n\nTwo parts: where each input comes from, then the rules for the audit. "
             "Read both on every request.\n\n" + exports.rstrip() + "\n\n" + rules)
    (out / "tc-file-audit-guide.md").write_text(guide, encoding="utf-8")

    utah = swap((ref / "utah-repc-deadlines.md").read_text(encoding="utf-8"))
    (out / "utah-repc-deadlines.md").write_text(utah, encoding="utf-8")

    code = swap((ref / "deadline-code.md").read_text(encoding="utf-8"))
    run = re.search(r"Write the file JSON.*?```\n\n", code, re.S)
    code = code.replace(run.group(0), (
        "Write the file JSON (the shape is in the code's header and in Part 2, section 3, of `tc-file-audit-guide.md`), "
        "save the code below as `tc_dates.py` in data analysis, and run it:\n\n"
        "    python3 tc_dates.py file.json --out out\n\n"
        "It prints the report and writes `tc_dates.md` and `tc_dates.json`. Don't paste the code into the conversation.\n\n"))
    code = code.replace("    python3 /tmp/tc_dates.py /tmp/tc/file.json --out OUTPUT_FOLDER", "    python3 tc_dates.py file.json --out OUTPUT_FOLDER")
    (out / "deadline-code.md").write_text(code, encoding="utf-8")

    for f in ("tc-file-audit-guide.md", "utah-repc-deadlines.md", "deadline-code.md"):
        t = (out / f).read_text(encoding="utf-8")
        assert "Claude" not in t and "references/" not in t and "SKILL.md" not in t, f
        print(f, len(t))


if __name__ == "__main__":
    main()
