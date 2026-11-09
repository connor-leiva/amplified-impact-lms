"""Builds the three reference files in chatgpt/ from the skill's own references and the shared ones.

ChatGPT Free allows 5 files per project, so the project holds 4: the instructions plus these three.
  due-diligence-guide.md     = references/review-guide.md + references/objection-writing.md
  utah-repc-and-timing.md    = references/utah-due-diligence-timing.md + skills/_shared/utah-repc.md
  utah-property-notes.md     = skills/_shared/utah-property-notes.md, unchanged

Rerun after any of those sources change:  python3 -I make_chatgpt_refs.py   (from anywhere)
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.normpath(os.path.join(HERE, "..", ".."))
SHARED = os.path.normpath(os.path.join(SKILL, "..", "_shared"))
OUT = os.path.join(SKILL, "chatgpt")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def body(text):
    """Drop the first heading and the Last verified line; keep the rest."""
    lines = text.split("\n")
    out = [l for l in lines[1:] if not l.startswith("Last verified:")]
    return "\n".join(out).strip() + "\n"


def demote(text):
    return re.sub(r"^(#+) ", lambda m: "#" + m.group(1) + " ", text, flags=re.M)


def rename(text):
    text = text.replace(
        "`utah-repc.md` was written before UAR's notice and says the new form's status couldn't be confirmed. "
        "Where the two files differ about the November 1, 2026 form, follow this file.",
        "Part 2 below was written before UAR's notice and says the new form's status couldn't be confirmed. "
        "Where Part 1 and Part 2 differ about the November 1, 2026 form, follow Part 1.")
    text = text.replace("`utah-repc.md` maps the December 4, 2024 form in full. This file adds",
                        "Part 2 below maps the December 4, 2024 form in full. Part 1 adds")
    text = text.replace("`utah-due-diligence-timing.md`", "`utah-repc-and-timing.md`")
    text = text.replace("`utah-repc.md`", "Part 2 below")
    text = text.replace("`utah-forms-and-counters.md`", "your broker")
    text = text.replace("This skill drafts", "These instructions draft")
    text = text.replace("What this skill needs", "What these instructions need")
    return text


def main():
    review = read(os.path.join(SKILL, "references", "review-guide.md"))
    objection = read(os.path.join(SKILL, "references", "objection-writing.md"))
    guide = (
        "# Due Diligence Guide\n\n"
        "Last verified: 2026-11-08 (the radon action level and test length, the seller concession point and the Utah form rules; "
        "the rest is review and drafting method)\n\n"
        "Two parts: how to review the documents, then how to write the objection list.\n\n"
        "## Part 1: Review Guide\n\n" + demote(rename(body(review))) + "\n"
        "## Part 2: Writing the Objection List\n\n" + demote(rename(body(objection)))
    )
    with open(os.path.join(OUT, "due-diligence-guide.md"), "w", encoding="utf-8") as fh:
        fh.write(guide)

    timing = read(os.path.join(SKILL, "references", "utah-due-diligence-timing.md"))
    repc = read(os.path.join(SHARED, "utah-repc.md"))
    utah = (
        "# Utah REPC and Due Diligence Timing\n\n"
        "Last verified: 2026-11-08\n\n"
        "Utah only. Part 1 covers both REPC versions now in use and how due diligence ends. Part 2 is the full set of notes on the "
        "December 4, 2024 REPC. Where they differ on the November 1, 2026 form, Part 1 controls.\n\n"
        "## Part 1: Which REPC, Which Sections, Which Dates\n\n" + demote(rename(body(timing))) + "\n"
        "## Part 2: Utah REPC Terms, Deadlines and Money (December 4, 2024 Form)\n\n" + demote(rename(body(repc)))
    )
    with open(os.path.join(OUT, "utah-repc-and-timing.md"), "w", encoding="utf-8") as fh:
        fh.write(utah)

    with open(os.path.join(OUT, "utah-property-notes.md"), "w", encoding="utf-8") as fh:
        fh.write(read(os.path.join(SHARED, "utah-property-notes.md")))
    print("wrote", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
