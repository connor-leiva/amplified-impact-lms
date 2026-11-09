"""Objective checks for a new-construction-review run.

Usage: python3 objective_checks.py OUTPUT_MD INPUT_FILE [INPUT_FILE ...] [--prompt "text"] [--today YYYY-MM-DD] [--general]

Reads the inputs (PDFs through pdftotext, text files as they are) and the prompt, then reports:
- every dollar amount, percentage and calendar date in the output that is not in the inputs or the prompt
  (each one must then be shown as computed in the output, or it is a failure),
- weekday labels that don't match the calendar,
- em or en dashes,
- the subject lines and whether each is in Title Case,
- whether a "Check before sending" section is present,
- banned stock phrases, account or wire numbers, protected-class or steering wording,
- words that suggest a cost or tax estimate, or advice on which lender to use,
- with --general, any mention of Utah law, the REPC or a PID.
It prints a report; a person grades the flagged items.
"""
import datetime as dt
import re
import subprocess
import sys

args = sys.argv[1:]
prompt, today, general = "", None, False
if "--prompt" in args:
    i = args.index("--prompt"); prompt = args[i + 1]; del args[i:i + 2]
if "--today" in args:
    i = args.index("--today"); today = args[i + 1]; del args[i:i + 2]
if "--general" in args:
    args.remove("--general"); general = True
out_path, inputs = args[0], args[1:]

out = open(out_path, encoding="utf-8").read()
src = [prompt]
for p in inputs:
    if p.lower().endswith(".pdf"):
        src.append(subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True).stdout)
    else:
        src.append(open(p, encoding="utf-8").read())
src = "\n".join(src)
flat = re.sub(r"\s+", " ", src)
MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December"


def money(s):
    return s.replace(",", "").rstrip(".")


src_money = {money(m) for m in re.findall(r"\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?", flat)}
src_pct = {p.replace(" ", "") for p in re.findall(r"\d+(?:\.\d+)?\s?%", flat)}
src_dates = set()
for m in re.finditer(rf"({MONTHS}) (\d{{1,2}}), (\d{{4}})", flat):
    src_dates.add(dt.date(int(m.group(3)), dt.datetime.strptime(m.group(1), "%B").month, int(m.group(2))))
for m in re.finditer(r"\b(\d{2})/(\d{2})/(\d{4})\b", flat):
    src_dates.add(dt.date(int(m.group(3)), int(m.group(1)), int(m.group(2))))
if today:
    src_dates.add(dt.date.fromisoformat(today))

rep = []
out_money = re.findall(r"\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?", out)
rep.append("Dollar amounts not in the inputs (must be shown as computed): " + (", ".join(sorted({m for m in out_money if money(m) not in src_money})) or "none"))
out_pct = {p.replace(" ", "") for p in re.findall(r"\d+(?:\.\d+)?\s?%", out)}
rep.append("Percentages not in the inputs: " + (", ".join(sorted(out_pct - src_pct)) or "none"))
bad = set()
for m in re.finditer(rf"({MONTHS}) (\d{{1,2}})(?:, (\d{{4}}))?", out):
    mon = dt.datetime.strptime(m.group(1), "%B").month
    years = [int(m.group(3))] if m.group(3) else [2026, 2027]
    try:
        cands = [dt.date(y, mon, int(m.group(2))) for y in years]
    except ValueError:
        bad.add(m.group(0)); continue
    if not any(c in src_dates for c in cands):
        bad.add(m.group(0))
rep.append("Calendar dates not in the inputs (must be shown as computed): " + (", ".join(sorted(bad)) or "none"))
wd_err = []
for m in re.finditer(rf"\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),? ({MONTHS}) (\d{{1,2}})(?:, (\d{{4}}))?", out):
    wd, mon, day, year = m.groups()
    mnum = dt.datetime.strptime(mon, "%B").month
    years = [int(year)] if year else [2026, 2027]
    if not any(dt.date(y, mnum, int(day)).strftime("%A") == wd for y in years):
        wd_err.append(m.group(0))
rep.append("Weekday labels that don't match the calendar: " + (", ".join(wd_err) or "none"))
rep.append("Em or en dashes: " + ("FOUND" if (chr(0x2013) in out or chr(0x2014) in out) else "none"))

SMALL = {"a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "at", "by", "vs"}
subjects = re.findall(r"\*\*Subject:\*\*\s*(.+)", out) + re.findall(r"^Subject:\s*(.+)$", out, re.M)
for s in subjects:
    words = re.findall(r"[A-Za-z][A-Za-z']*", s)
    lower = [w for w in words if w[0].islower()]
    rep.append(f"Subject: {s.strip()} | Title Case: {'yes' if not lower else 'NO, lowercase: ' + ', '.join(lower)}")
if not subjects:
    rep.append("Subject lines: none found")
rep.append("Check before sending section: " + ("present" if re.search(r"^#+\s*(\d+\.\s*)?Check Before Sending", out, re.I | re.M) else "MISSING"))
banned = [p for p in ["stunning", "dream home", "don't hesitate to reach out", "rest assured", "exciting news"] if p in out.lower()]
rep.append("Banned stock phrases: " + (", ".join(banned) or "none"))
acct = re.findall(r"\b(?:routing|account|acct|wire instructions?)\b[^\n]{0,40}\d{4,}", out, re.I)
rep.append("Account, routing or wire numbers: " + (", ".join(acct) or "none"))
pc = re.findall(r"\b(?:families with (?:young )?children|perfect for (?:a )?(?:young|retired|family|couple)|church|ethnic|religio\w+|disabilit\w+|national origin|safe neighborhood|good schools|great schools)\b", out, re.I)
rep.append("Protected-class or steering wording: " + (", ".join(pc) or "none"))
est = re.findall(r"[^\n]{0,60}\b(?:estimated? (?:cost|tax)|would cost|roughly \$|about \$|approximately \$|ballpark)[^\n]{0,60}", out, re.I)
rep.append("Possible cost or tax estimates (check each is quoted from a document): " + (" || ".join(e.strip() for e in est) or "none"))
advice = re.findall(r"[^\n]{0,60}\b(?:you should (?:use|go with|switch)|I recommend (?:using|switching|the builder's lender|your credit union)|better deal|worth it|the better (?:loan|option))[^\n]{0,60}", out, re.I)
rep.append("Possible loan advice (check each one): " + (" || ".join(a.strip() for a in advice) or "none"))
if general:
    utah = re.findall(r"[^\n]{0,50}\b(?:Utah|REPC|57-1-49|17D-4|public infrastructure district|PID|R162|61-2f)\b[^\n]{0,50}", out)
    rep.append("General mode, Utah references: " + (" || ".join(u.strip() for u in utah) or "none"))
email = re.search(r"\*\*Subject:\*\*.*?(?=\n## |\Z)", out, re.S)
if email:
    rep.append(f"Buyer email words (subject to next section): {len(re.findall(r'[A-Za-z0-9$][^ \n]*', email.group(0)))}")
print("\n".join(rep))
