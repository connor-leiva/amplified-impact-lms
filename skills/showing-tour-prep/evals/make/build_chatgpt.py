"""Builds the ChatGPT Project's reference files from the Claude skill's references, so the two stay in step.

Usage (from the skill folder): python3 evals/make/build_chatgpt.py
Writes chatgpt/tour-guide.md (tour-guide.md plus tour-sheet-writing.md), chatgpt/utah-tour-notes.md
(utah-tour-notes.md plus the shared utah-property-notes.md) and chatgpt/buyer-agreements.md (the shared copy).
chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, "..", ".."))
SHARED = os.path.normpath(os.path.join(SKILL, "..", "_shared"))


def read(path):
    return open(path, encoding="utf-8").read()


def retarget(text):
    text = text.replace("`tour-sheet-writing.md`", "the Writing section of `tour-guide.md`")
    text = text.replace("`utah-property-notes.md`", "the Utah Property Notes section of `utah-tour-notes.md`")
    text = text.replace("`tour-guide.md`, section 1", "section 1 of `tour-guide.md`")
    return text


def demote(text):
    """Push every heading down one level so a merged file keeps one H1. Code blocks (templates) stay as written."""
    out, in_code = [], False
    for line in text.split("\n"):
        if line.startswith("```"):
            in_code = not in_code
        elif not in_code and re.match(r"^#+ ", line):
            line = "#" + line
        out.append(line)
    return "\n".join(out)


guide = read(os.path.join(SKILL, "references", "tour-guide.md"))
writing = read(os.path.join(SKILL, "references", "tour-sheet-writing.md"))
writing = writing.replace("# Writing the Tour Sheet and the Agent-Only Page", "# Writing: The Tour Sheet and the Agent-Only Page", 1)
out = retarget(guide).rstrip() + "\n\n" + demote(retarget(writing)).rstrip() + "\n"
open(os.path.join(SKILL, "chatgpt", "tour-guide.md"), "w", encoding="utf-8").write(out)

notes = read(os.path.join(SKILL, "references", "utah-tour-notes.md"))
prop = read(os.path.join(SHARED, "utah-property-notes.md"))
notes = notes.replace("## In `utah-property-notes.md`", "## What the Utah Property Notes Section Covers")
out = retarget(notes).rstrip() + "\n\n" + demote(prop).rstrip() + "\n"
open(os.path.join(SKILL, "chatgpt", "utah-tour-notes.md"), "w", encoding="utf-8").write(out)

open(os.path.join(SKILL, "chatgpt", "buyer-agreements.md"), "w", encoding="utf-8").write(read(os.path.join(SHARED, "buyer-agreements.md")))
print("wrote chatgpt/tour-guide.md, chatgpt/utah-tour-notes.md, chatgpt/buyer-agreements.md")
