"""Writes references/pipeline-code.md from the dev copy of the code (evals/make/fub_pipeline.py), so the two never drift.

python3 -I skills/fub-pipeline-review/evals/make/embed_code.py

Then run build_chatgpt.py, which copies the same file into chatgpt/.
"""
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
HEAD = """# Pipeline Code

Last verified: 2026-11-10. The Follow Up Boss columns this code reads (the People export's Date Added, Name, Stage, Lead Source, Assigned To, Tags, Deal Stage, Deal Close Date and Deal Price, the People-view columns Last Communication and Last Activity, and the Deals report's Name, Stage, Status, Entered Stage, Close Date, Price and Team) and Follow Up Boss's default stages are described, with their sources, in `fub-exports.md`. The rules for the four decision lists, aging, conversion and odd rows are in `review-rules.md`.

Run this code with Python 3 on the uploaded files. It uses Python's standard library, plus openpyxl for an .xlsx file. Do not paste it into the conversation. It never prints an email address or a phone number: it reads them only to match the same person in this week's and last week's exports.

Usage:

    python3 fubpr.py --people THIS_WEEK.csv [--deals DEALS.csv] [--last-week LAST_WEEK.csv] --as-of YYYY-MM-DD [--days 7] [--period-start YYYY-MM-DD] [--period-end YYYY-MM-DD] [--rules rules.json] [--out FOLDER]

It prints the data and writes pipeline_review.md (every table, with the arithmetic) and pipeline_review.json (the same, for drafting) to FOLDER.

What it does: finds each file's header row and columns by name (and shows which column it used for what); reads each stage as a Follow Up Boss default, a common custom stage or a guess, and says which; counts people by stage with how long since each was last communicated with; reads each deal's stage as open, closed or fell through; builds the four decision lists (deals past their expected close date, appointment-stage people with no next step in the export, hot or active people with nothing logged in more than the set number of days, and pipeline stages with no movement since last week); matches this week's export to last week's by ID, email, phone or name and lists every stage change; works out conversion by lead source and by agent for the period, each rate as numerator / denominator; counts each agent's records; writes the questions for each agent; and lists every odd row without fixing it.

"""


def main():
    code = (SKILL / "evals" / "make" / "fub_pipeline.py").read_text(encoding="utf-8").rstrip() + "\n"
    assert "```" not in code
    md = HEAD + "```python\n" + code + "```\n"
    (SKILL / "references" / "pipeline-code.md").write_text(md, encoding="utf-8")
    print("wrote references/pipeline-code.md", len(md), "chars")


if __name__ == "__main__":
    main()
