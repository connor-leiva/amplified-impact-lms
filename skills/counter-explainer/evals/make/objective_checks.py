"""Objective checks for a counter-explainer run.

Usage: python3 objective_checks.py OUTPUT_MD INPUT_FILE [INPUT_FILE ...] [--prompt "text"] [--today YYYY-MM-DD]

Reads the inputs (PDFs through pdftotext, text files as they are) and the prompt, then reports:
- every dollar amount, percentage, clock time and calendar date in the output that does not appear in
  the inputs or the prompt (each one must then be shown as computed, or it is a failure),
- em or en dashes,
- the subject lines and whether each is in Title Case,
- whether a "Check before sending" section is present,
- stock phrases the house rules ban,
- anything that looks like an account, routing or wire number, or protected-class wording.
It prints a report; a person grades the flagged items.
"""
import datetime as dt
import re
import subprocess
import sys

args = sys.argv[1:]
prompt = ""
today = None
if "--prompt" in args:
    i = args.index("--prompt")
    prompt = args[i + 1]
    del args[i:i + 2]
if "--today" in args:
    i = args.index("--today")
    today = args[i + 1]
    del args[i:i + 2]
out_path, inputs = args[0], args[1:]

out = open(out_path, encoding="utf-8").read()
src = [prompt]
for p in inputs:
    if p.lower().endswith(".pdf"):
        src.append(subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True).stdout)
    else:
        src.append(open(p, encoding="utf-8").read())
src = "\n".join(src)
src_flat = re.sub(r"\s+", " ", src)

MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"


def norm_money(s):
    return s.replace(",", "")


src_money = {norm_money(m) for m in re.findall(r"\$\d{1,3}(?:,\d{3})*(?:\.\d+)?", src)}
src_pct = set(re.findall(r"\d+(?:\.\d+)?%", src_flat.replace(" %", "%")))
src_times = {t.replace(" ", "").upper() for t in re.findall(r"\b\d{1,2}:\d{2}\s?(?:AM|PM)\b", src_flat, re.I)}
for m in re.finditer(r"\b(\d{1,2}:\d{2})\s*\[ \]\s*AM\s*\[X\]\s*PM", src_flat):
    src_times.add(m.group(1) + "PM")
for m in re.finditer(r"\b(\d{1,2}:\d{2})\s*\[X\]\s*AM", src_flat):
    src_times.add(m.group(1) + "AM")

src_dates = set()
for m in re.finditer(rf"({MONTHS}) (\d{{1,2}}), (\d{{4}})", src_flat):
    src_dates.add(dt.date(int(m.group(3)), dt.datetime.strptime(m.group(1), "%B").month, int(m.group(2))))
for m in re.finditer(r"\b(\d{2})/(\d{2})/(\d{4})\b", src_flat):
    src_dates.add(dt.date(int(m.group(3)), int(m.group(1)), int(m.group(2))))
if today:
    src_dates.add(dt.date.fromisoformat(today))

report = []

money_out = re.findall(r"\$\d{1,3}(?:,\d{3})*(?:\.\d+)?", out)
report.append("Dollar amounts not in the inputs: " + (", ".join(sorted({m for m in money_out if norm_money(m) not in src_money})) or "none"))
pct_out = set(re.findall(r"\d+(?:\.\d+)?%", out))
report.append("Percentages not in the inputs: " + (", ".join(sorted(p for p in pct_out if p not in src_pct)) or "none"))
times_out = {t.replace(" ", "").upper() for t in re.findall(r"\b\d{1,2}:\d{2}\s?(?:AM|PM)\b", out, re.I)}
report.append("Clock times not in the inputs: " + (", ".join(sorted(times_out - src_times)) or "none"))

bad_dates = set()
for m in re.finditer(rf"({MONTHS}) (\d{{1,2}})(?:, (\d{{4}}))?", out):
    year = int(m.group(3)) if m.group(3) else None
    month = dt.datetime.strptime(m.group(1), "%B").month
    day = int(m.group(2))
    cands = [dt.date(year, month, day)] if year else [dt.date(y, month, day) for y in (2026, 2027)]
    if not any(c in src_dates for c in cands):
        bad_dates.add(m.group(0))
for m in re.finditer(r"\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,? (?:(" + MONTHS[:0] + r"Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*) (\d{1,2})", out):
    pass
report.append("Calendar dates not in the inputs (must be shown as computed): " + (", ".join(sorted(bad_dates)) or "none"))

weekday_errors = []
for m in re.finditer(rf"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun),? ({MONTHS}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? (\d{{1,2}})(?:, (\d{{4}}))?", out):
    wd, mon, day, year = m.groups()
    mon_num = dt.datetime.strptime(mon[:3], "%b").month
    years = [int(year)] if year else [2026, 2027]
    ok = any(dt.date(y, mon_num, int(day)).strftime("%a") == wd[:3] for y in years)
    if not ok:
        weekday_errors.append(m.group(0))
report.append("Weekday labels that don't match the calendar: " + (", ".join(weekday_errors) or "none"))

report.append("Em or en dashes: " + ("FOUND" if (chr(0x2013) in out or chr(0x2014) in out) else "none"))

subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", out)
SMALL = {"a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "at", "by"}
for s in subjects:
    words = re.findall(r"[A-Za-z][A-Za-z']*", s)
    lower = [w for w in words if w[0].islower()]
    report.append(f"Subject: {s.strip()} | Title Case: {'yes' if not lower else 'NO, lowercase: ' + ', '.join(lower)}")
if not subjects:
    report.append("Subject lines: none found")

report.append("Check before sending section: " + ("present" if re.search(r"^#+\s*Check Before Sending", out, re.I | re.M) else "MISSING"))
banned = [p for p in ["stunning", "dream home", "don't hesitate to reach out", "rest assured", "exciting news"] if p in out.lower()]
report.append("Banned stock phrases: " + (", ".join(banned) or "none"))
acct = re.findall(r"\b(?:routing|account|acct|wire instructions?)\b[^\n]{0,40}\d{4,}", out, re.I)
report.append("Account, routing or wire numbers: " + (", ".join(acct) or "none"))
pc = re.findall(r"\b(?:families with (?:young )?children|perfect for (?:a )?(?:young|retired|family|couple)|church|ethnic|religio\w+|disabilit\w+|national origin|safe neighborhood|good schools)\b", out, re.I)
report.append("Protected-class or steering wording: " + (", ".join(pc) or "none"))

body = re.search(r"## Client Message\n(.*?)\n## ", out, re.S)
if body:
    words = len(re.findall(r"\b[\w$',.:/]+\b", body.group(1)))
    report.append(f"Client message words (heading to next section): {words}")

print("\n".join(report))
