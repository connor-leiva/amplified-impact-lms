"""Builds the three reference files of the ChatGPT Project version from the Claude skill's sources.

Usage: python3 build_chatgpt.py SKILL_DIR

ChatGPT Free holds 5 project files, so the project gets 4: the instructions (written by hand in
chatgpt/instructions.md) plus these three, merged from the skill's references and the shared Utah files:
  counter-explainer-guide.md      references/reading-the-chain.md + references/drafting-guide.md
  utah-repc.md                    skills/_shared/utah-repc.md, as is apart from file names
  utah-counters-and-new-repc.md   skills/_shared/utah-forms-and-counters.md + references/utah-repc-2026.md
Rerun it whenever any of those sources change, so the two versions don't drift.
"""
import os
import sys

SKILL = sys.argv[1]
SHARED = os.path.join(os.path.dirname(os.path.abspath(SKILL)), "_shared")
OUT = os.path.join(SKILL, "chatgpt")

RENAMES = {
    "`utah-forms-and-counters.md`": "`utah-counters-and-new-repc.md` (first part)",
    "`utah-repc-2026.md`": "`utah-counters-and-new-repc.md` (second part)",
    "`reading-the-chain.md`": "`counter-explainer-guide.md`",
    "`drafting-guide.md`": "`counter-explainer-guide.md`",
    "`utah-repc.md`": "`utah-repc.md`",
}


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def rename(text):
    for old, new in RENAMES.items():
        text = text.replace(old, new)
    return text


def demote(text):
    """Turn a file's '# Title' into '## Title' and push every other heading down one level."""
    lines = []
    for line in text.splitlines():
        if line.startswith("#"):
            line = "#" + line
        lines.append(line)
    return "\n".join(lines)


def write(name, text):
    if "–" in text or "—" in text:
        raise SystemExit(f"{name} has an em or en dash")
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(text.rstrip() + "\n")
    print("wrote", name, len(text), "characters")


os.makedirs(OUT, exist_ok=True)

guide = (
    "# Counter Explainer Guide\n\n"
    "Two parts: Reading the Chain (how to read a contract and its counters and addenda as one deal) and "
    "Drafting Guide (how to write the client message, the requested changes and the Check before sending list).\n\n"
    + demote(rename(read(os.path.join(SKILL, "references", "reading-the-chain.md"))))
    + "\n\n"
    + demote(rename(read(os.path.join(SKILL, "references", "drafting-guide.md"))))
)
write("counter-explainer-guide.md", guide)

write("utah-repc.md", rename(read(os.path.join(SHARED, "utah-repc.md"))))

counters = (
    "# Utah Counteroffers and the New REPC\n\n"
    "Two parts: Utah forms, addenda and counteroffer rules (first part), and how the REPC effective November 1, 2026 "
    "differs from the December 4, 2024 form (second part). Each part keeps its own Last verified date and sources.\n\n"
    + demote(rename(read(os.path.join(SHARED, "utah-forms-and-counters.md"))))
    + "\n\n"
    + demote(rename(read(os.path.join(SKILL, "references", "utah-repc-2026.md"))))
)
write("utah-counters-and-new-repc.md", counters)
