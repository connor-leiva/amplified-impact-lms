"""Write the practice files and the eval input files for inbox-meeting-follow-through.

Run from anywhere:  python3 -I evals/make/make_files.py   (paths resolve from this file)

Everything written is made up: .example domains, 555 phone numbers, zeroed account numbers.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import eval1_data  # noqa: E402
import eval2_data  # noqa: E402
import eval3_data  # noqa: E402
import practice_data  # noqa: E402
from mailbox import render  # noqa: E402

SKILL = HERE.parent.parent
PRACTICE = SKILL / "practice"
FILES = SKILL / "evals" / "files"

PRACTICE_README = """PRACTICE FILE: made-up example.

# Practice Files: Inbox and Meeting Follow-Through

Everything here is made up. Every person, company, address, email, phone number and account number in these files is fictional.

These files are a made-up team leader's Thursday morning: Jordan Samplewood, who runs the Samplewood Home Team.

- `PRACTICE Inbox Export (40 conversations).txt`: 40 email conversations, the shape you get when you paste or print threads (Inbox from November 2 to 5, 2026, and Sent Mail from October 29). One of them is a fake wire instructions email. Don't skip it.
- `PRACTICE Leadership Huddle 2026-11-04 (Zoom transcript).txt`: a Zoom audio transcript (Zoom saves it as .vtt; it's saved here as .txt so it attaches anywhere).
- `PRACTICE Listing Check-In 2026-11-04 (Otter transcript).txt`: an Otter export with one unnamed speaker.
- `PRACTICE Team Roster.csv`: names, roles and emails.

Attach all four and say:

> Run my morning pass. Treat today as Thursday, November 5, 2026, 7:30 AM Mountain, and my last pass was yesterday at 7:30 AM. Nothing is connected; my inbox export, yesterday's two meeting transcripts and my roster are attached.
"""


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("wrote", path.relative_to(SKILL))


def main():
    # Practice
    write(PRACTICE / "README.md", PRACTICE_README)
    write(PRACTICE / "PRACTICE Inbox Export (40 conversations).txt",
          render(practice_data.HEADER, practice_data.CONVERSATIONS))
    write(PRACTICE / "PRACTICE Leadership Huddle 2026-11-04 (Zoom transcript).txt", practice_data.zoom_vtt())
    write(PRACTICE / "PRACTICE Listing Check-In 2026-11-04 (Otter transcript).txt", practice_data.otter_txt())
    write(PRACTICE / "PRACTICE Team Roster.csv", practice_data.ROSTER)

    # Eval 1: 40 threads
    e1 = FILES / "eval-1-inbox-40"
    write(e1 / "Mailbox export 2026-11-03 (40 conversations).txt", render(eval1_data.HEADER, eval1_data.CONVERSATIONS))
    write(e1 / "Team roster.csv", eval1_data.ROSTER)

    # Eval 2: two transcripts
    e2 = FILES / "eval-2-two-transcripts"
    write(e2 / "Weekly Leadership Meeting 2026-10-28 (Zoom transcript).txt", eval2_data.zoom_vtt())
    write(e2 / "Agent Team Huddle 2026-10-28 (Granola notes and transcript).txt", eval2_data.granola_txt())
    write(e2 / "Team roster.csv", eval2_data.ROSTER)

    # Eval 3: Friday rollup
    e3 = FILES / "eval-3-friday-rollup"
    write(e3 / "Digests Monday and Wednesday.md", eval3_data.DIGESTS)
    write(e3 / "Outlook threads pasted Wed to Fri.txt", render(eval3_data.HEADER, eval3_data.CONVERSATIONS))

    counts = {"practice": len(practice_data.CONVERSATIONS), "eval-1": len(eval1_data.CONVERSATIONS),
              "eval-3": len(eval3_data.CONVERSATIONS)}
    print("conversations:", counts)
    assert counts["practice"] == 40 and counts["eval-1"] == 40


if __name__ == "__main__":
    main()
