"""Copies the place-neutral references into the ChatGPT Project version, so the two versions can't drift.

python3 skills/ai-brain-setup/evals/make/build_chatgpt.py

brain-templates.md (the interview, the screening table, the four blocks) and utah-brain-notes.md say nothing about
where a block goes in an app, so they ship to ChatGPT unchanged. chatgpt/instructions.md, chatgpt/paste.txt and
chatgpt/chatgpt-workspace.md (ChatGPT's places) are written by hand. Fails if a copied file mentions Claude, and
checks the ChatGPT version holds 4 files to upload and a paste under 1,000 characters.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
OUT = SKILL / "chatgpt"


def main():
    for name in ("brain-templates.md", "utah-brain-notes.md"):
        text = (SKILL / "references" / name).read_text(encoding="utf-8")
        for bad in ("Claude", "SKILL.md", "references/"):
            assert bad not in text, (name, bad)
        (OUT / name).write_text(text, encoding="utf-8")
    uploads = sorted(p.name for p in OUT.glob("*.md"))
    assert len(uploads) <= 4, uploads
    paste = (OUT / "paste.txt").read_text(encoding="utf-8")
    assert len(paste) <= 1000, len(paste)
    assert "ai-brain-setup-instructions.md" in paste
    for name in uploads:
        if name != "instructions.md":
            assert name in (OUT / "instructions.md").read_text(encoding="utf-8"), f"instructions.md doesn't name {name}"
    print(f"copied 2 references; uploads: {', '.join(uploads)}; paste.txt {len(paste)} characters")


if __name__ == "__main__":
    main()
