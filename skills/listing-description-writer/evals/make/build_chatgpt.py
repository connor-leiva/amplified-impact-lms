"""Builds the ChatGPT Project version from the skill itself, so the two versions can't drift.

python3 skills/listing-description-writer/evals/make/build_chatgpt.py

Writes:
- chatgpt/instructions.md: SKILL.md's body, step for step, with the reference paths turned into this project's
  file names, "this skill" turned into "you", a line on counting without code, the voice line pointed at the
  QUICK CARD, a sibling skill's name replaced, and a short "The Files in This Project" section added.
- chatgpt/writing-guide.md, chatgpt/fair-housing-review.md and chatgpt/utah-mls-and-advertising.md: the three
  references, unchanged (none of them names Claude).
chatgpt/paste.txt is written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
OUT = SKILL / "chatgpt"
FILES = ("writing-guide.md", "fair-housing-review.md", "utah-mls-and-advertising.md")

HEAD = """# Listing Description Writer: Instructions

Version 1.0, by Amplified Impact. Follow these instructions for every request in this project.

"""

FILES_SECTION = """This is for writing one listing's public remarks, headlines and social caption, or for checking listing wording the agent already has. If the person wants help pricing a listing, preparing a buyer's showing tour, weekly content ideas, or a market statistics email, say this project isn't built for that.

## The Files in This Project

- `writing-guide.md`: where listing facts come from and how far to trust each source, the fact sheet, what never to invent, and how to write the remarks, headlines, caption, Facts I Used and Check before sending. Read it on every request.
- `fair-housing-review.md`: the federal rules, the review list with rewrite patterns, and how to write the review. Read it on every request.
- `utah-mls-and-advertising.md`: Utah only. UtahRealEstate.com's remarks rules and public marketing rule, Utah's brokerage name rule for ads, and Utah's fair housing classes. Read it whenever the property is in Utah.

"""

SWAPS = [
    ("Turn a listing's facts into", "You turn a listing's facts into"),
    ("This skill writes only what the documents support, and checks every word",
     "You write only what the documents support, and check every word"),
    ("Run, Draft, Own: this skill reads every input, builds a fact sheet with sources, sets aside agent-only fields, "
     "compares sources, counts characters, and runs the fair housing review on its own.",
     "Run, Draft, Own: you read every input, build a fact sheet with sources, set aside agent-only fields, "
     "compare sources, count characters, and run the fair housing review on your own."),
    ("`references/writing-guide.md`", "`writing-guide.md`"),
    ("`references/utah-mls-and-advertising.md`", "`utah-mls-and-advertising.md`"),
    ("`references/fair-housing-review.md`", "`fair-housing-review.md`"),
    ('report "N of LIMIT characters." Recount after every edit.',
     'report "N of LIMIT characters." Recount after every edit. If you can\'t run code, say the count is approximate.'),
    ("or a voice skill)", "or the QUICK CARD pasted in this project's instructions)"),
    ("no list price advice (that's pricing-conversation-prep)", "no list price advice (pricing is a separate conversation)"),
]


def main():
    OUT.mkdir(exist_ok=True)
    body = (SKILL / "SKILL.md").read_text(encoding="utf-8").split("---\n", 2)[2]
    body = body.replace("# Listing Description Writer\n", "", 1).lstrip("\n")
    for old, new in SWAPS:
        assert old in body, f"SKILL.md no longer has: {old[:60]}"
        body = body.replace(old, new)
    body = body.replace("## 1. Gather the Facts", FILES_SECTION + "## 1. Gather the Facts", 1)
    for bad in ("Claude", "SKILL.md", "references/", "this skill", "pricing-conversation-prep"):
        assert bad not in body, f"instructions mention {bad}"
    (OUT / "instructions.md").write_text(HEAD + body, encoding="utf-8")

    for name in FILES:
        text = (SKILL / "references" / name).read_text(encoding="utf-8")
        for bad in ("Claude", "SKILL.md", "references/"):
            assert bad not in text, f"{name} mentions {bad}"
        (OUT / name).write_text(text, encoding="utf-8")
    print("wrote chatgpt/instructions.md and copied", ", ".join(FILES))


if __name__ == "__main__":
    main()
