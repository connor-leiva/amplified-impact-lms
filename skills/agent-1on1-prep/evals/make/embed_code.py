"""Writes references/prep-code.md from the dev copy of the code (evals/make/prep_1on1.py), so the two never drift.

python3 -I skills/agent-1on1-prep/evals/make/embed_code.py

Then run build_chatgpt.py, which copies the same file into chatgpt/.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
HEAD = """# Prep Code

Last verified: 2026-11-10. The Sisu and Follow Up Boss measures this code reads (appointments set and met, signed, under contract, closed units, closed volume and GCI, by month) and where they come from are described, with their sources, in `exports.md`. The rules for goals, the pace math, what changed, commitments and privacy are in `prep-rules.md`.

Run this code with Python 3 on the uploaded numbers. It uses Python's standard library, plus openpyxl for an .xlsx file. Do not paste it into the conversation. It never prints another agent's name or numbers, or any value from a pay column (split, take-home, income, cap, fees).

Usage:

    python3 prep1on1.py --numbers FILE [--agent "NAME"] [--goals goals.json] [--goals-source FILE ...] [--as-of YYYY-MM-DD] [--last-1on1 YYYY-MM-DD] [--through YYYY-MM] [--plan-start YYYY-MM] [--columns columns.json] [--out FOLDER]

It prints the data and writes one_on_one_data.md (every table, with the arithmetic) and one_on_one_data.json (the same, for drafting) to FOLDER.

What it does: finds the month-by-month table in a CSV or any sheet of a workbook (one row per month, or months across the top) and shows which column it read as which measure, marking any reading to confirm; keeps only the named agent's rows when the file holds several agents; leaves pay columns unread; checks every goal in goals.json against the files it came from and leaves out any goal whose quote or number isn't there; sums each measure for the plan year through the last full month before the as-of date, stopping at any empty or unreadable month instead of filling it; prorates each goal (by month when monthly goals are given, else evenly) and works out pace, the difference and what the annual goal needs per month left, each with its arithmetic; divides each pair of year-to-date counts; compares the year to date at the last one-on-one with now, and each month since with the agent's own monthly average before it; lists focus candidates from those numbers only; and lists every odd cell without fixing it.

"""


def main():
    code = (SKILL / "evals" / "make" / "prep_1on1.py").read_text(encoding="utf-8").rstrip() + "\n"
    assert "```" not in code
    md = HEAD + "```python\n" + code + "```\n"
    (SKILL / "references" / "prep-code.md").write_text(md, encoding="utf-8")
    print("wrote references/prep-code.md", len(md), "chars")


if __name__ == "__main__":
    main()
