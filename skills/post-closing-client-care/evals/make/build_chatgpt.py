"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 -I skills/post-closing-client-care/evals/make/build_chatgpt.py

Writes chatgpt/post-closing-client-care-guide.md (references/client-care-guide.md and
references/reviews-and-vendors.md in one file, so the Project holds 4 files), chatgpt/utah-client-care.md
(references/utah-client-care.md with its file pointers renamed), and copies the shared outreach-rules.md
unchanged. chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"

SPHERE = "the agent's sphere plan (Amplified Impact's Sphere Touch Plan)"


def swap(text, pairs):
    for old, new in pairs:
        assert old in text, old
        text = text.replace(old, new)
    return text


def main():
    guide = (SKILL / "references" / "client-care-guide.md").read_text(encoding="utf-8")
    guide = swap(guide, [
        ("# Client Care Guide: The First Year After Closing", "# Post-Closing Client Care Guide"),
        ("The review and vendor rules are in `reviews-and-vendors.md`, the texting",
         "The review and vendor rules are in the last part of this file (Reviews and Vendors), the texting"),
        ("(as gathered for Amplified Impact's FUB Automation Audit and Sphere Touch Plan, with",
         "(as gathered for Amplified Impact's other Follow Up Boss tools, with"),
        ("| Handed to sphere-touch-plan: the client joins the agent's sphere plan as a past client |",
         f"| Handed to {SPHERE}: the client joins it as a past client |"),
        ("(sphere-touch-plan sets that up)", "(Amplified Impact's Sphere Touch Plan sets that up)"),
        ("and that sphere-touch-plan covers the setup.", "and that the Sphere Touch Plan covers the setup."),
        ('"Closing day: card and thank-you email (Post-Closing Client Care drafts)"', '"Closing day: card and thank-you email"'),
        ("facts as gathered for Amplified Impact's FUB Automation Audit and Sphere Touch Plan from the articles",
         "facts as gathered for Amplified Impact's other Follow Up Boss tools from the articles"),
    ])
    rv = (SKILL / "references" / "reviews-and-vendors.md").read_text(encoding="utf-8")
    rv = swap(rv, [
        ("# Reviews and Vendors: The Rules", "# Reviews and Vendors"),
        ("This skill drafts no reward for a review either way.", "These instructions draft no reward for a review either way."),
        ("whether a particular payment is legal is the broker's or an attorney's call, and the skill doesn't make it.",
         "whether a particular payment is legal is the broker's or an attorney's call, and these drafts don't make it."),
        ("The skill never drafts that form.", "Never draft that form."),
        ("is not this skill's work.", "is not this project's work."),
        ("### What the Skill Does With This", "### What to Do With This"),
    ])
    rv = "\n".join(("#" + line) if line.startswith("#") else line for line in rv.splitlines()) + "\n"
    merged = guide.rstrip("\n") + "\n\n" + rv

    utah = (SKILL / "references" / "utah-client-care.md").read_text(encoding="utf-8")
    utah = swap(utah, [
        ("**What the skill does with this:**", "**What to do with this:**"),
        ("the disclosure flag in `reviews-and-vendors.md`", "the disclosure flag in `post-closing-client-care-guide.md` (Reviews and Vendors)"),
        ("- What the skill does, as house practice rather than a Utah rule:", "- What these drafts do, as house practice rather than a Utah rule:"),
    ])

    for name, text in (("post-closing-client-care-guide.md", merged), ("utah-client-care.md", utah)):
        for bad in ("Claude", "SKILL.md", "references/", "skill", chr(0x2014), chr(0x2013), "reviews-and-vendors.md",
                    "client-care-guide.md`", "sphere-touch-plan"):
            if bad == "client-care-guide.md`":
                assert "`client-care-guide.md`" not in text, (name, bad)
                continue
            assert bad not in text, (name, bad)
        (OUT / name).write_text(text, encoding="utf-8")
    (OUT / "outreach-rules.md").write_text((SHARED / "outreach-rules.md").read_text(encoding="utf-8"), encoding="utf-8")
    print("wrote chatgpt/post-closing-client-care-guide.md and chatgpt/utah-client-care.md, copied outreach-rules.md")


if __name__ == "__main__":
    main()
