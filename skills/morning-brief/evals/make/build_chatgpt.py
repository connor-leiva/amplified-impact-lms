"""Writes the ChatGPT Project version (chatgpt/) from the Claude skill, so the two never drift.

Run from anywhere: python3 skills/morning-brief/evals/make/build_chatgpt.py
- chatgpt/instructions.md: SKILL.md's body, with the file names a Project uses and no mention of
  Claude, SKILL.md or references/.
- chatgpt/morning-brief-rules.md: references/brief-rules.md as it is.
- chatgpt/morning-brief-inputs.md: references/inputs.md, with ChatGPT's attaching line.
chatgpt/paste.txt is written by hand (1,000 characters or fewer).
"""

from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]


def swap(text: str, old: str, new: str) -> str:
    if old not in text:
        raise SystemExit(f"build_chatgpt: expected text not found: {old[:60]}")
    return text.replace(old, new)


def instructions() -> str:
    body = (SKILL / "SKILL.md").read_text().split("---\n", 2)[2]
    body = swap(
        body,
        "# Morning Brief\n",
        "# Morning Brief: Instructions\n\nVersion 1.0, by Amplified Impact. Follow these instructions for every request in this project. "
        "The other files in this project are `morning-brief-rules.md` (the rules for owners, dates, the top three, decisions and the open list) "
        "and `morning-brief-inputs.md` (what each input is and where it comes from).\n",
    )
    body = swap(body, "Where each one comes from: `references/inputs.md`.", "Where each one comes from: `morning-brief-inputs.md`.")
    body = swap(body, "Read `references/brief-rules.md`.", "Read `morning-brief-rules.md`.")
    body = swap(body, "by the rules in `references/brief-rules.md`", "by the rules in `morning-brief-rules.md`")
    body = swap(body, "The words in `references/brief-rules.md` under", "The words in `morning-brief-rules.md` under")
    body = swap(body, "never send the note. With a connector, read only.", "never send the note. With an app connected to this project, read only.")
    body = swap(body, "This skill never writes", "This project never writes")
    body = swap(body, "The risk this skill guards against", "The risk this project guards against")
    body = swap(
        body,
        'If the user asks for one part ("just the open items"), give that part with What I Used and Check Before Sending.\n',
        'If the user asks for one part ("just the open items"), give that part with What I Used and Check Before Sending.\n\n'
        "Not for a pass over email and meetings, planning the week, the weekly L10 agenda, the pipeline review itself, or putting tasks "
        "into a task tool. Say this project isn't built for those.\n\nNo em dashes or en dashes anywhere in the brief or the note.\n",
    )
    for banned in ("references/", "Claude", "SKILL.md"):
        if banned in body:
            raise SystemExit(f"build_chatgpt: instructions still mention {banned}")
    return body.lstrip("\n")


def inputs() -> str:
    text = (SKILL / "references" / "inputs.md").read_text()
    text = swap(text, " If Claude won't take the .ics file, rename it to .txt.", " If ChatGPT won't take the .ics file, rename it to .txt.")
    text = swap(
        text,
        'In Claude, click "+" in the chat box, then "Add files or photos." Source: Claude Help Center, "Upload files to Claude," '
        "https://support.claude.com/en/articles/8241126-uploading-files-to-claude (checked 2026-11-08).",
        "Start the chat inside this project and attach the files in the message box, or paste the text. Files that stay the same "
        "every day (the roster) can go on the project's Sources tab instead.",
    )
    if "Claude" in text:
        raise SystemExit("build_chatgpt: inputs still mention Claude")
    return text


if __name__ == "__main__":
    out = SKILL / "chatgpt"
    (out / "instructions.md").write_text(instructions())
    (out / "morning-brief-rules.md").write_text((SKILL / "references" / "brief-rules.md").read_text())
    (out / "morning-brief-inputs.md").write_text(inputs())
    print("wrote", out)
