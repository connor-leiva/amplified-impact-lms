"""Builds the reference files of the ChatGPT Project version from the skill's own references and the shared
Utah files, so the two versions say the same thing. Rerun after editing any of them.

Usage: python3 -I build_chatgpt.py SKILL_DIR
  chatgpt/offer-strategy-guide.md   = references/offer-terms.md + Part 2 references/comp-method.md
  chatgpt/utah-offer-terms.md       = references/utah-offer-terms.md + Part 2 _shared/utah-pricing-context.md
                                      + Part 3 _shared/utah-forms-and-counters.md
  chatgpt/utah-repc-both-forms.md   = Part 1 _shared/utah-repc.md + Part 2 _shared/utah-repc-2026.md
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
    ("`offer-terms.md`", "`offer-strategy-guide.md`"),
    ("`comp-method.md`", "Part 2 of `offer-strategy-guide.md`"),
    ("`utah-pricing-context.md`", "Part 2 of `utah-offer-terms.md`"),
    ("`utah-forms-and-counters.md`", "Part 3 of `utah-offer-terms.md`"),
    ("`utah-repc-2026.md`", "Part 2 of `utah-repc-both-forms.md`"),
    ("`utah-repc.md`", "Part 1 of `utah-repc-both-forms.md`"),
    (" (see `buyer-agreements.md`)", " (the buyer agreement and the broker control it)"),
]


def read(path):
    return open(path, encoding="utf-8").read()


def fix(text):
    for a, b in NAMES:
        text = text.replace(a, b)
    assert "buyer-agreements.md" not in text and "references/" not in text
    return text


def part(n, text):
    """Demote a file's title to a Part heading so several files read as one."""
    return re.sub(r"^# (.+)$", lambda m: f"# Part {n}: {m.group(1)}", text, count=1, flags=re.M)


def write(name, text):
    with open(os.path.join(out, name), "w", encoding="utf-8") as f:
        f.write(text.rstrip() + "\n")


guide = fix(read(os.path.join(ref, "offer-terms.md")))
comp = fix(read(os.path.join(ref, "comp-method.md")))
write("offer-strategy-guide.md",
      guide.replace("# Offer Terms:", "# Offer Strategy Guide, Part 1:", 1) + "\n\n---\n\n" + part(2, comp))

utah = fix(read(os.path.join(ref, "utah-offer-terms.md")))
pricing = fix(read(os.path.join(shared, "utah-pricing-context.md")))
STALE = "- A revised REPC is pending, with mandatory use set for January 1, 2027. Section numbers may change. Read them from the signed contract. See Part 1 of `utah-repc-both-forms.md`."
CURRENT = ("- A revised REPC, effective November 1, 2026, is in use, and only it may be used from January 1, 2027. On it the "
           "appraisal condition is Section 12.2 and runs to a separate Appraisal Deadline, Section 4(c). See Part 1 of this "
           "file and Part 2 of `utah-repc-both-forms.md`.")
assert STALE in pricing, "shared utah-pricing-context.md changed: update build_chatgpt.py"
pricing = pricing.replace(STALE, CURRENT)
forms = fix(read(os.path.join(shared, "utah-forms-and-counters.md")))
write("utah-offer-terms.md",
      part(1, utah) + "\n\n---\n\n" + part(2, pricing) + "\n\n---\n\n" + part(3, forms))

repc = fix(read(os.path.join(shared, "utah-repc.md")))
repc26 = fix(read(os.path.join(shared, "utah-repc-2026.md")))
write("utah-repc-both-forms.md", part(1, repc) + "\n\n---\n\n" + part(2, repc26))
print("wrote offer-strategy-guide.md, utah-offer-terms.md, utah-repc-both-forms.md")
