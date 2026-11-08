"""Write references/analysis-code.md from a Python file (the dev copy of the analysis), then sync chatgpt/.

Usage: python3 -I evals/make/embed_code.py PATH/TO/dhc.py
"""
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parents[2]
HEAD = """# Analysis Code

Last verified: 2026-11-08. The Follow Up Boss column names, default stages and export behavior this code relies on come from Follow Up Boss's help center: Export Contacts to a Spreadsheet (https://help.followupboss.com/hc/en-us/articles/360015269133-Export-Contacts-to-a-Spreadsheet), Changing a Lead Stage (https://help.followupboss.com/hc/en-us/articles/360012456793-Changing-a-Lead-Stage) and Importing Contacts Overview (https://help.followupboss.com/hc/en-us/articles/4402323033751-Importing-Contacts-Overview). The day limits are this skill's defaults, explained in the health rules.

Run this code with Python 3 on the uploaded export. It uses only Python's standard library (plus openpyxl for an .xlsx file). Do not paste it into the conversation, and never print contact rows: the code keeps names, emails and phone numbers out of everything except the worklist file.

Usage:

    python3 dhc.py EXPORT.csv [--transactions CLOSED.csv] [--rules rules.json] [--as-of YYYY-MM-DD] [--out FOLDER]

It prints the full report and writes three files to FOLDER: health_report.md and health_report.json (counts and percentages only) and cleanup_worklist.csv (one row per record that needs work, the only file with names, emails and phone numbers).

"""


def main():
    code = Path(sys.argv[1]).read_text(encoding="utf-8").rstrip() + "\n"
    assert "```" not in code
    md = HEAD + "```python\n" + code + "```\n"
    (SKILL / "references" / "analysis-code.md").write_text(md, encoding="utf-8")
    print("wrote references/analysis-code.md", len(md), "chars")


if __name__ == "__main__":
    main()
