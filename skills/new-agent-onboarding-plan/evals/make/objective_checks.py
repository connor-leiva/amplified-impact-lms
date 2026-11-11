"""Objective checks for one new-agent-onboarding-plan run.

Usage: python3 -I objective_checks.py RUN_DIR [--output output.md] [--files FILE ...] [--prompt TEXT]
                                      [--dates plan_dates.json] [--forbid TERM ...] [--forbid-in-plan TERM ...]

Checks: no em or en dashes; Title Case subject lines; the Bottom Line first, at three sentences or fewer;
Needs Your Answer before the plan; Check Before Sending (or Saving) last; every long or short date in the output
is in the dates code's output, the prompt or the files; every number traces to the prompt, the files or the dates
code's output (listed for a person to check when it doesn't); the welcome note under 250 words; no exclamation
marks or banned phrases in the drafts; no account, routing or Social Security numbers; forbidden terms absent
from the whole output (--forbid) or from the plan and drafts (--forbid-in-plan). Prints a report; exits 1 on
any failure.
"""
import argparse
import json
import os
import re
import subprocess
import sys

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"
SHORT = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec"
SMALL = {"a", "an", "and", "the", "to", "of", "in", "on", "for", "with", "at", "by", "or", "your"}


def text_of(path):
    low = path.lower()
    if low.endswith(".pdf"):
        return subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    if low.endswith(".xlsx"):
        from openpyxl import load_workbook
        wb = load_workbook(path, data_only=True)
        return "\n".join(" ".join("" if c is None else str(c) for c in row) for ws in wb for row in ws.iter_rows(values_only=True))
    if low.endswith(".docx"):
        from docx import Document
        d = Document(path)
        parts = [p.text for p in d.paragraphs]
        for t in d.tables:
            for r in t.rows:
                parts.append(" ".join(c.text for c in r.cells))
        return "\n".join(parts)
    return open(path, encoding="utf-8").read()


def section(md, start, stop):
    a = md.find(start)
    if a < 0:
        return ""
    b = md.find(stop, a + len(start))
    return md[a:b if b >= 0 else len(md)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--output", default="output.md")
    ap.add_argument("--files", nargs="*", default=[])
    ap.add_argument("--prompt", default="")
    ap.add_argument("--dates", default=None)
    ap.add_argument("--forbid", nargs="*", default=[])
    ap.add_argument("--forbid-in-plan", nargs="*", default=[])
    a = ap.parse_args()

    out = open(os.path.join(a.run, a.output), encoding="utf-8").read()
    sources = a.prompt + "\n" + "\n".join(text_of(f) for f in a.files)
    dates_text = ""
    if a.dates:
        dates_text = json.dumps(json.load(open(a.dates, encoding="utf-8")))
        md = os.path.join(os.path.dirname(a.dates), "plan_dates.md")
        if os.path.exists(md):
            dates_text += open(md, encoding="utf-8").read()
    results = []

    def check(name, ok, detail=""):
        results.append((name, ok, detail))

    check("No em or en dashes", not re.search("[\u2013\u2014]", out))

    subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", out)
    bad = []
    for s in subjects:
        for i, w in enumerate(re.findall(r"[A-Za-z][A-Za-z'’]*", s)):
            if (i == 0 or w.lower() not in SMALL) and not w[0].isupper():
                bad.append(s)
                break
    has_drafts = "## Drafts" in out
    check("Title Case subject lines", (bool(subjects) or not has_drafts) and not bad, f"{len(subjects)} subjects" + (f"; not Title Case: {bad}" if bad else ""))

    heads = re.findall(r"^## (.+)$", out, re.M)
    check("Bottom Line is the first section", bool(heads) and heads[0].startswith("Bottom Line"), str(heads[:2]))
    bl = section(out, "## Bottom Line", "\n## ").split("\n", 1)[-1].strip()
    sentences = [s for s in re.split(r"(?<=[.?])\s+(?=[A-Z])", bl) if s.strip()]
    check("Bottom line is three sentences or fewer", 0 < len(sentences) <= 3, f"{len(sentences)} sentences")
    if "Needs Your Answer" in heads:
        later = [h for h in heads if h.startswith(("Plan at a Glance", "The Setup", "The First 30 Days"))]
        check("Needs Your Answer comes before the plan", all(heads.index("Needs Your Answer") < heads.index(h) for h in later))
    else:
        check("Needs Your Answer comes before the plan", False, "no Needs Your Answer section")
    check("Check Before Sending (or Saving) is last", bool(heads) and heads[-1].startswith("Check Before"), heads[-1] if heads else "")

    longs = re.findall(rf"(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (?:{MONTHS}) \d{{1,2}}", out)
    shorts = re.findall(rf"(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:{SHORT}) \d{{1,2}}\b", out)
    import datetime as dt
    forms = []
    for iso in set(re.findall(r"\d{4}-\d{2}-\d{2}", dates_text)):
        d = dt.date.fromisoformat(iso)
        forms.append(f"{d:%A}, {d:%B} {d.day}")
        forms.append(f"{d:%a} {d:%b} {d.day}")
    pool = sources + dates_text + "\n".join(forms)
    untraced_dates = sorted({d for d in longs if d not in pool} | {d for d in shorts if d not in pool})
    check("Every date is from the dates code, the prompt or the files", not untraced_dates, "; ".join(untraced_dates) or f"{len(set(longs)) + len(set(shorts))} dates")

    num = r"(?<![\w.,])\d+(?:,\d{3})*(?:\.\d+)?(?![\w])"
    nums = set(re.findall(num, out))
    pool_nums = set(re.findall(num, pool))
    untraced = sorted(n for n in nums if n not in pool_nums)
    results.append(("Numbers not found in the inputs or the dates code (check by hand)", True, ", ".join(untraced) or "none"))

    welcome = section(out, "### Welcome Note", "\n### ")
    words = len(re.findall(r"\b[\w'’]+\b", welcome.split("\n", 1)[-1])) if welcome else 0
    if has_drafts:
        check("Welcome note under 250 words", 0 < words < 250, f"{words} words")
    drafts = section(out, "## Drafts", "\n## Check Before")
    check("No exclamation marks in the drafts", "!" not in drafts)
    banned = [p for p in ("stunning", "dream", "don't hesitate", "don’t hesitate") if p in drafts.lower()]
    check("No banned phrases in the drafts", not banned, ", ".join(banned))
    acct = re.findall(r"\b\d{3}-\d{2}-\d{4}\b|routing number|account number|\b\d{9}\b", out, re.I)
    check("No Social Security, routing or account numbers", not acct, ", ".join(acct))

    lower = out.lower()
    hits = [t for t in a.forbid if t.lower() in lower]
    check("Forbidden terms absent everywhere", not hits, ", ".join(hits) or f"{len(a.forbid)} terms checked")
    plan = section(out, "## Plan at a Glance", "\n## Check Before").lower()
    hits = [t for t in a.forbid_in_plan if t.lower() in plan]
    check("Forbidden terms absent from the plan and drafts", not hits, ", ".join(hits) or f"{len(a.forbid_in_plan)} terms checked")

    failed = False
    for name, ok, detail in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f": {detail}" if detail else ""))
        failed |= not ok
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
