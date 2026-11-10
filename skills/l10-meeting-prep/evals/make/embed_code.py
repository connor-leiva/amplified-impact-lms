"""Writes references/prep-code.md from the dev copy of the code (evals/make/l10_prep.py), so the two never drift.

python3 -I skills/l10-meeting-prep/evals/make/embed_code.py

Then run build_chatgpt.py, which copies the same file into chatgpt/.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
HEAD = """# Prep Code

Last verified: 2026-11-10. The export layouts this code reads (Ninety's scorecard CSV with the newest week on the left, its Rocks, To-Dos and Issues spreadsheets, Bloom Growth's meeting export CSVs, and spreadsheets) are described, with their sources, in `exports.md`. The agenda times are EOS Worldwide's, in `l10-agenda.md`. The rules for misses, empty cells, rock status and the to-do window are in `prep-rules.md`.

Run this code with Python 3 on the uploaded files. It uses Python's standard library, plus openpyxl for an .xlsx file. Do not paste it into the conversation.

Usage:

    python3 l10.py --scorecard FILE [--rocks FILE] [--todos FILE [--todos FILE2]] [--issues FILE] [--headlines FILE] --meeting-date YYYY-MM-DD [--start HH:MM] [--week YYYY-MM-DD] [--weeks 13] [--goals goals.json] [--out FOLDER]

It prints the data and writes l10_prep_data.md (every table and the arithmetic) and l10_prep_data.json (the same, for drafting) to FOLDER.

What it does: finds each file's header row and columns by name (and shows which column it used for what); sorts the scorecard's weeks by date, whichever way the file runs; picks the newest week with numbers on or before the meeting date; reads each measurable's own goal and its direction; marks each week's cell hit, miss, empty or not a number, and never fills an empty one; repeats each rock's status as written or "no status given"; counts the to-dos due in the 7 days up to the meeting and works out the completion rate from the ones with a status; lists the issues (short-term and long-term apart) and the headlines as written; and gives the agenda's clock times.

"""


def main():
    code = (SKILL / "evals" / "make" / "l10_prep.py").read_text(encoding="utf-8").rstrip() + "\n"
    assert "```" not in code
    md = HEAD + "```python\n" + code + "```\n"
    (SKILL / "references" / "prep-code.md").write_text(md, encoding="utf-8")
    print("wrote references/prep-code.md", len(md), "chars")


if __name__ == "__main__":
    main()
