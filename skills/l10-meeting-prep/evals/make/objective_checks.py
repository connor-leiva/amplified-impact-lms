"""Objective checks for l10-meeting-prep runs.

python3 -I skills/l10-meeting-prep/evals/make/objective_checks.py <case> [output.md]
  case: practice, case-1, case-2

Checks: no em or en dashes; Title Case subject lines; a Check Before Sending section; a bottom line of three
sentences or fewer; the IDS order labeled a suggestion; every number in the output found in the inputs, the prompt
or the run's own l10_prep_data.md (each miss listed for a person to grade); strings that must never appear for the
case; strings that must appear; words that judge a person; wire or account details. Writes nothing; prints a report.
"""
import re
import sys
from pathlib import Path

import openpyxl

SKILL = Path(__file__).resolve().parents[2]
CASES = {
    "practice": {
        "files": ["practice/" + f for f in ("PRACTICE Scorecard Export 13 Weeks.csv", "PRACTICE Rocks Q4 2026.csv",
                                            "PRACTICE To-Dos.csv", "PRACTICE Issues List.xlsx", "PRACTICE Headlines.txt")],
        "prompt": "Prep our L10 for Tuesday, November 17 at 9:00 AM.",
        "never": [],
        "must": ["7 done / 10 with a status = 70.0%", "No status given", "(empty)", "7 against at most 5"],
    },
    "case-1": {
        "files": ["evals/files/case1/" + f for f in ("Pickleberry Point Weekly Scorecard.xlsx", "Ninety Rocks Export.xlsx",
                                                     "Ninety To-Dos Export.xlsx", "Issues List.csv", "Headlines.txt")],
        "prompt": "Our L10 is Wednesday, November 18 at 8:30 AM.",
        "never": ["surgery", "knee", "mom's"],
        "must": ["9 done / 11 with a status = 81.8%", "9 against at most 5", "at most 5", "Off-Track", "On-Track",
                 "8:55 AM to 9:55 AM", "left out"],
    },
    "case-2": {
        "files": ["evals/files/case2/" + f for f in ("KPI (Metrics).csv", "Quarterly Priorities (Goals).csv",
                                                     "To-Dos.csv", "O&O (Issues).csv")],
        "prompt": ("L10 is Monday 11/16 at 10:00 AM. Customer: the buyers on Taffy Trail sent us a five-star review. "
                   "Employee: Thimble starts her TC certification course next week."),
        "never": ["probably on track", "likely on track", "looks on track", "assumed on track"],
        "must": ["6 done / 9 with a status = 66.7%", "No status given", "(empty)", "12 against at most 10",
                 "276 against at least 300", "Draft the listing launch checklist outline"],
    },
}
JUDGE = r"\b(struggl\w*|slipping|behind|underperform\w*|lazy|step up|falling short|dropped the ball|poor(ly)?|failing|unreliable|not pulling)\b"
SMALL = {str(i) for i in range(0, 13)}


def file_text(path):
    if path.suffix.lower() == ".xlsx":
        wb = openpyxl.load_workbook(path, data_only=True)
        out = []
        for ws in wb.worksheets:
            for row in ws.iter_rows(values_only=True):
                out.append(" ".join("" if v is None else (v.strftime("%m/%d/%Y") if hasattr(v, "strftime") else str(v)) for v in row))
        return "\n".join(out)
    return path.read_text(encoding="utf-8")


def numbers(text):
    return [t.replace(",", "") for t in re.findall(r"\d[\d,]*(?:\.\d+)?", text)]


def section(text, title):
    m = re.search(r"^## " + re.escape(title) + r".*?$(.*?)(?=^## |\Z)", text, re.M | re.S)
    return m.group(1) if m else ""


def main():
    case = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else "output.md"
    cfg = CASES[case]
    run = SKILL / "evals" / "runs" / case
    text = (run / name).read_text(encoding="utf-8")
    src = "\n".join(file_text(SKILL / f) for f in cfg["files"]) + "\n" + cfg["prompt"]
    data = (run / "files" / "l10_prep_data.md").read_text(encoding="utf-8") if (run / "files" / "l10_prep_data.md").exists() else ""
    results = []

    def rec(label, ok, note=""):
        results.append((label, "PASS" if ok else "FAIL", note))

    rec("No em or en dashes", not re.search("[" + chr(0x2013) + chr(0x2014) + "]", text))
    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", text)
    bad = [s for s in subjects if any(w[0].islower() for w in re.findall(r"[A-Za-z][\w']*", s))]
    rec("Title Case subject lines", not bad, "; ".join(subjects) if subjects else "no subject line (no note needed?)")
    rec("Check Before Sending section", bool(re.search(r"^## Check Before Sending", text, re.M)))
    bl = section(text, "Bottom Line").strip()
    sentences = [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", bl) if s.strip()]
    rec("Bottom line three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")
    ids = section(text, "IDS: Issues List and Suggested Order")
    rec("IDS order labeled a suggestion", "suggestion" in ids.lower() and "team picks" in ids.lower())
    found = [s for s in cfg["never"] if s.lower() in text.lower()]
    rec("Never-appear strings absent", not found, ", ".join(found))
    missing = [s for s in cfg["must"] if s not in text]
    rec("Must-appear strings present", not missing, ", ".join(missing))
    judge = sorted(set(m.group(0).lower() for m in re.finditer(JUDGE, text, re.I)))
    quoted = [w for w in judge if re.search(r"\b" + re.escape(w) + r"\b", src, re.I)]
    own = [w for w in judge if w not in quoted]
    rec("No words judging a person", not own, ", ".join(own))
    if quoted:
        results.append(("Judging words that are quoted from an input title (review)", "NOTE", ", ".join(quoted)))
    wire = re.findall(r"routing number|account number|wire (?:instructions|transfer)|social security", text, re.I)
    rec("No wire or account details", not wire, ", ".join(wire))
    src_nums = set(numbers(src)) | set(numbers(data))
    misses = sorted({n for n in numbers(text) if n not in src_nums and n not in SMALL}, key=lambda s: (len(s), s))
    rec("Every number in the inputs or the run (grade each miss)", not misses, ", ".join(misses))

    print(f"Objective checks: {case} / {name}")
    for label, res, note in results:
        print(f"- {res}  {label}" + (f": {note}" if note else ""))


if __name__ == "__main__":
    main()
