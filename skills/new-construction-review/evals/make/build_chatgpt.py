"""Builds the ChatGPT Project's reference files for new-construction-review from the skill's references.

Usage: python3 build_chatgpt.py SKILL_DIR

Writes, into SKILL_DIR/chatgpt/:
- new-construction-guide.md: references/review-guide.md and references/drafting-guide.md, merged
- lender-incentives-respa.md: references/lender-incentives-respa.md, with file names adjusted
- utah-new-construction-and-repc.md: references/utah-new-construction.md, then the parts of the shared
  Utah references the skill uses (the November 1, 2026 REPC, the December 4, 2024 REPC section map and
  new construction note, licensee form rules, and the property notes on PIDs, HOA rentals, reinvestment
  fees and water)
chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
import os
import re
import sys

SKILL = sys.argv[1]
REF = os.path.join(SKILL, "references")
SHARED = os.path.join(SKILL, "..", "_shared")
OUT = os.path.join(SKILL, "chatgpt")
os.makedirs(OUT, exist_ok=True)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def sections(text, keep):
    """The '## ' sections of a markdown file whose headings start with any string in keep."""
    parts = re.split(r"(?m)^(?=## )", text)
    return "".join(p for p in parts if any(p.startswith("## " + k) for k in keep))


def demote(text):
    """One heading level down, so a merged file keeps one H1."""
    return re.sub(r"(?m)^(#{1,5}) ", lambda m: "#" + m.group(1) + " ", text)


NAMES = {
    "`lender-incentives-respa.md`": "`lender-incentives-respa.md` (in this project)",
    "`utah-new-construction.md`": "`utah-new-construction-and-repc.md` (in this project)",
    "`buyer-agreements.md`": "the buyer's written agreement with the brokerage (confirm the rules with the broker)",
    "`utah-forms-and-counters.md`": "the Licensee Forms part of this file",
    "`utah-repc.md`": "the December 4, 2024 REPC part of this file",
    "`utah-repc-2026.md`": "the November 1, 2026 REPC part of this file",
    "`utah-property-notes.md`": "the Utah Property Notes part of this file",
    "`review-guide.md`": "the Review Guide part of `new-construction-guide.md`",
    "`drafting-guide.md`": "the Drafting Guide part of `new-construction-guide.md`",
}


def rename(text):
    for a, b in NAMES.items():
        text = text.replace(a, b)
    return text


# 1. new-construction-guide.md
guide = ("# New Construction Guide\n\n"
         "Two parts: the Review Guide (how to read a builder's purchase agreement, term by term) and the Drafting Guide "
         "(questions for the builder's rep, the attorney list, key dates, the buyer email and Check before sending).\n\n"
         + demote(read(os.path.join(REF, "review-guide.md")))
         + "\n" + demote(read(os.path.join(REF, "drafting-guide.md"))))
guide = guide.replace("`buyer-agreements.md`", "the buyer agreement rules (the brokerage may not receive more than the buyer's written agreement allows; confirm with the broker)")
guide = rename(guide)

# 2. lender-incentives-respa.md
lender = rename(read(os.path.join(REF, "lender-incentives-respa.md")))

# 3. utah-new-construction-and-repc.md
utah = ["# Utah New Construction and the REPC\n\n"
        "Utah facts for reviewing a builder's purchase agreement. Use only for a Utah property; outside Utah, skip this file. "
        "Parts: Utah New Construction Notes; the November 1, 2026 REPC; the December 4, 2024 REPC (section map and new construction); "
        "Licensee Forms; Utah Property Notes (public infrastructure districts, HOA rentals, reinvestment fees, water).\n\n",
        demote(read(os.path.join(REF, "utah-new-construction.md"))),
        "\n## The November 1, 2026 REPC\n\n",
        demote(read(os.path.join(SHARED, "utah-repc-2026.md")).split("\n", 1)[1]),
        "\n## The December 4, 2024 REPC\n\nLast verified: 2026-11-08. Source: https://commerce.utah.gov/wp-content/uploads/2023/03/purchase-contract.pdf\n\n",
        demote(sections(read(os.path.join(SHARED, "utah-repc.md")), ["Check the Version First", "Section Map", "New Construction"])),
        "\n## Licensee Forms\n\nLast verified: 2026-11-08. Sources: https://le.utah.gov/xcode/Title61/Chapter2F/61-2f-S306.html and https://adminrules.utah.gov/Rule/325\n\n",
        demote(sections(read(os.path.join(SHARED, "utah-forms-and-counters.md")), ["What a Licensee May Do", "What a Licensee May Not Do", "When an Attorney"])),
        "\n## Utah Property Notes\n\nLast verified: 2026-11-08. Not legal advice; the recorded documents and the current statute control. Sources are listed at the end of this part.\n\n",
        demote(sections(read(os.path.join(SHARED, "utah-property-notes.md")),
                        ["Public Infrastructure Districts", "HOA Rental Restrictions", "HOA Reinvestment Fees", "Water Rights", "New Construction", "Sources"]))]
utah = rename("".join(utah))

for name, text in [("new-construction-guide.md", guide), ("lender-incentives-respa.md", lender), ("utah-new-construction-and-repc.md", utah)]:
    assert chr(0x2013) not in text and chr(0x2014) not in text, name
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(text)
    print("wrote", name, len(text))
