"""Builds the ChatGPT Project files that come from the skill's references, so the two versions can't drift.

python3 skills/ai-brain-tuneup/evals/make/build_chatgpt.py

Copies references/chatgpt-workspace.md and references/tune-up-rules.md into chatgpt/ unchanged (both are written
without naming any other app, so they read the same in a ChatGPT Project). references/claude-workspace.md is not
copied. chatgpt/instructions.md and chatgpt/paste.txt are written by hand.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
OUT = SKILL / "chatgpt"


def main():
    OUT.mkdir(exist_ok=True)
    for name in ("chatgpt-workspace.md", "tune-up-rules.md"):
        text = (SKILL / "references" / name).read_text(encoding="utf-8")
        for bad in ("Claude", "SKILL.md", "references/", "skill"):
            assert bad not in text, f"{name} mentions {bad}"
        (OUT / name).write_text(text, encoding="utf-8")
    print("copied chatgpt-workspace.md and tune-up-rules.md into chatgpt/")


if __name__ == "__main__":
    main()
