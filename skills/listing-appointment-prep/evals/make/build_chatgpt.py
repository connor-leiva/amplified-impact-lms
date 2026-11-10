"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/listing-appointment-prep/evals/make/build_chatgpt.py

Writes chatgpt/listing-appointment-prep-guide.md (prep-guide.md, net-sheet.md and objections.md merged as Parts
1 to 3) and copies nar-and-federal-rules.md and utah-listing-appointment.md with their pointers to the other
files renamed. chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
REFS = SKILL / "references"
OUT = SKILL / "chatgpt"
GUIDE = "listing-appointment-prep-guide.md"


def renamed(text):
    for old, new in [
        ("`prep-guide.md`", f"Part 1 of `{GUIDE}`"),
        ("`net-sheet.md`", f"Part 2 of `{GUIDE}`"),
        ("`objections.md`", f"Part 3 of `{GUIDE}`"),
    ]:
        text = text.replace(old, new)
    return text


def main():
    prep = (REFS / "prep-guide.md").read_text(encoding="utf-8")
    net = (REFS / "net-sheet.md").read_text(encoding="utf-8")
    obj = (REFS / "objections.md").read_text(encoding="utf-8")

    prep = prep.replace("# Listing Appointment Prep Guide", "# Part 1: Reading the Inputs and Building the Plan", 1)
    net = net.replace("# Seller Net Sheet: Estimate, Not a Closing Statement", "# Part 2: The Seller Net Sheet (Estimate, Not a Closing Statement)", 1)
    obj = obj.replace("# Non-Price Objections", "# Part 3: Non-Price Objections", 1)
    # Inside one file, the parts point to each other by part.
    prep = prep.replace("in `nar-and-federal-rules.md` and, in Utah, `utah-listing-appointment.md`",
                        "in nar-and-federal-rules.md and, in Utah, utah-listing-appointment.md")
    obj = obj.replace("(questions in `prep-guide.md`)", "(questions in Part 1)")

    merged = (
        "# Listing Appointment Prep Guide\n\n"
        "Part 1 is how to read the inputs and build the plan, the questions, the marketing plan and what to bring. "
        "Part 2 is the seller net sheet. Part 3 is the answers to non-price objections. The rules they rest on are in "
        "nar-and-federal-rules.md and, in Utah, utah-listing-appointment.md.\n\n"
        + renamed(prep).rstrip() + "\n\n" + renamed(net).rstrip() + "\n\n" + renamed(obj).rstrip() + "\n"
    )
    # The sibling is a product in both apps: name it as the product, not the skill's folder.
    merged = merged.replace("pricing-conversation-prep", "Pricing Conversation Prep")
    for bad in ("Claude", "SKILL.md", "references/"):
        assert bad not in merged, bad

    OUT.mkdir(exist_ok=True)
    (OUT / GUIDE).write_text(merged, encoding="utf-8")
    for name in ("nar-and-federal-rules.md", "utah-listing-appointment.md"):
        text = renamed((REFS / name).read_text(encoding="utf-8")).replace("pricing-conversation-prep", "Pricing Conversation Prep")
        for bad in ("Claude", "SKILL.md", "references/"):
            assert bad not in text, (name, bad)
        (OUT / name).write_text(text, encoding="utf-8")
    print(f"wrote chatgpt/{GUIDE} and copied nar-and-federal-rules.md and utah-listing-appointment.md")


if __name__ == "__main__":
    main()
