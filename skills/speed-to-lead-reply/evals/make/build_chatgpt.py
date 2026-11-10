"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/speed-to-lead-reply/evals/make/build_chatgpt.py

Copies references/lead-reply-guide.md, references/utah-lead-reply-notes.md and the shared outreach-rules.md into
chatgpt/, unchanged, after checking they name nothing a ChatGPT Project doesn't have. chatgpt/instructions.md and
chatgpt/paste.txt are written by hand from SKILL.md.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
SHARED = SKILL.parent / "_shared"
OUT = SKILL / "chatgpt"


def main():
    files = {
        "lead-reply-guide.md": SKILL / "references" / "lead-reply-guide.md",
        "utah-lead-reply-notes.md": SKILL / "references" / "utah-lead-reply-notes.md",
        "outreach-rules.md": SHARED / "outreach-rules.md",
    }
    OUT.mkdir(exist_ok=True)
    for name, src in files.items():
        text = src.read_text(encoding="utf-8")
        for bad in ("Claude", "SKILL.md", "references/"):
            assert bad not in text, (name, bad)
        (OUT / name).write_text(text, encoding="utf-8")
    print("copied", ", ".join(files), "into chatgpt/")


if __name__ == "__main__":
    main()
