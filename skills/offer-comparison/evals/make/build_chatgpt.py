"""Builds the reference files of the ChatGPT Project version from the skill's own references and the shared
Utah files, so the two versions say the same thing. Rerun after editing any of them.

Usage: python3 -I build_chatgpt.py SKILL_DIR
  chatgpt/offer-comparison-guide.md  = references/comparison-guide.md
  chatgpt/utah-offer-comparison.md   = references/utah-offer-comparison.md + Part 2 _shared/utah-forms-and-counters.md
  chatgpt/utah-repc-both-forms.md    = Part 1 _shared/utah-repc.md + Part 2 _shared/utah-repc-2026.md
The project holds four files (these three plus instructions.md), inside ChatGPT Free's five. File names are
rewritten to the project's names, and nothing points to a folder.
"""
import os
import re
import sys

skill = sys.argv[1]
ref = os.path.join(skill, "references")
shared = os.path.join(skill, "..", "_shared")
out = os.path.join(skill, "chatgpt")

NAMES = [
    ("`comparison-guide.md`", "`offer-comparison-guide.md`"),
    ("`utah-forms-and-counters.md`", "Part 2 of `utah-offer-comparison.md`"),
    ("`utah-repc-2026.md`", "Part 2 of `utah-repc-both-forms.md`"),
    ("`utah-repc.md`", "Part 1 of `utah-repc-both-forms.md`"),
    (" (see `buyer-agreements.md`)", " (the buyer-broker agreement and the broker control it)"),
]


def read(path):
    return open(path, encoding="utf-8").read()


def fix(text):
    for a, b in NAMES:
        text = text.replace(a, b)
    assert "buyer-agreements.md" not in text and "references/" not in text, "an unmapped file name is left"
    return text


def part(n, text):
    """Demote a file's title to a Part heading so several files read as one."""
    return re.sub(r"^# (.+)$", lambda m: f"# Part {n}: {m.group(1)}", text, count=1, flags=re.M)


def write(name, text):
    text = text.replace(f"of `{name}`", "of this file")
    with open(os.path.join(out, name), "w", encoding="utf-8") as f:
        f.write(text.rstrip() + "\n")


write("offer-comparison-guide.md", fix(read(os.path.join(ref, "comparison-guide.md"))))

utah = fix(read(os.path.join(ref, "utah-offer-comparison.md")))
forms = fix(read(os.path.join(shared, "utah-forms-and-counters.md")))
write("utah-offer-comparison.md", part(1, utah) + "\n\n---\n\n" + part(2, forms))

repc = fix(read(os.path.join(shared, "utah-repc.md")))
repc26 = fix(read(os.path.join(shared, "utah-repc-2026.md")))
write("utah-repc-both-forms.md", part(1, repc) + "\n\n---\n\n" + part(2, repc26))
print("wrote offer-comparison-guide.md, utah-offer-comparison.md, utah-repc-both-forms.md")
