"""Objective checks for one run of repair-request-response.

Usage: python3 objective_checks.py OUTPUT_MD PROMPT_TEXT INPUT_PDF [INPUT_PDF ...] [--computed 3830,6410] [--refs]
Prints each check with PASS or FAIL and the evidence. Numbers in the output that appear in no input
(and aren't listed as computed arithmetic or today's date) are listed for a person to review.
--refs also counts numbers in the skill's own reference files (statute and section numbers, verified
thresholds), since those are cited facts, not facts about the deal.
"""
import re
import subprocess
import sys

args = sys.argv[1:]
use_refs = "--refs" in args
args = [a for a in args if a != "--refs"]
computed = set()
if "--computed" in args:
    i = args.index("--computed")
    computed = {c.strip() for c in args[i + 1].split(",") if c.strip()}
    args = args[:i] + args[i + 2:]
out_path, prompt, inputs = args[0], args[1], args[2:]
out = open(out_path, encoding="utf-8").read()
src = prompt + "\n" + "\n".join(
    subprocess.run(["pdftotext", "-layout", p, "-"], capture_output=True, text=True, check=True).stdout for p in inputs)
if use_refs:
    import glob
    import json
    import os
    skill = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
    shared = json.load(open(os.path.join(skill, "skill.json")))["shared"]
    refs = glob.glob(os.path.join(skill, "references", "*.md")) + [os.path.join(skill, "..", "_shared", s) for s in shared]
    src += "\n" + "\n".join(open(r, encoding="utf-8").read() for r in refs)


def norm(n):
    n = n.replace("$", "").replace(",", "")
    if n.endswith(".00"):
        n = n[:-3]
    return n


src_nums = {norm(m) for m in re.findall(r"\$?\d[\d,]*(?:\.\d+)?", src)}
# Today's date and its parts, and the weekday-free calendar numbers the skill adds, are allowed.
allowed = src_nums | {norm(c) for c in computed} | {"2026", "8", "11"}
results = []


def check(name, ok, evidence=""):
    results.append((name, ok, evidence))


check("No em or en dashes", not re.search("[–—]", out))
check("Check before sending section", bool(re.search(r"^## Check Before Sending", out, re.M)))

subjects = re.findall(r"\*\*Subject: (.+?)\*\*", out)
small_ok = {"St", "Ln", "Dr", "Ct", "N", "E", "S", "W", "No."}
bad_subj = [s for s in subjects for w in re.findall(r"[A-Za-z][A-Za-z'.]*", s) if w[0].islower()]
check("Title Case subject lines", bool(subjects) and not bad_subj, "; ".join(subjects))

stock = [p for p in ["stunning", "dream home", "don't hesitate", "do not hesitate"] if p in out.lower()]
check("No stock phrases", not stock, ", ".join(stock))

wire = [p for p in ["routing 0", "account 0", "Example Community Bank", "wire to", "ACH to"] if p.lower() in out.lower()]
check("No wire, routing or account details", not wire, ", ".join(wire))

mls = [p for p in ["lockbox", "private remarks", "showing instructions", "access code"] if p in out.lower()]
check("No agent-only MLS fields", not mls, ", ".join(mls))

text_wo_rooms = re.sub(r"family room", "", out, flags=re.I)
protected = [p for p in ["families", "family", "kids", "children", "church", "religio", "race", "ethnic", "elderly", "young couple",
                         "retiree", "school", "safe neighborhood", "demographic", "disabled", "wheelchair", "national origin"]
             if re.search(r"\b" + p, text_wo_rooms, re.I)]
check("No protected-class language", not protected, ", ".join(protected))

typical = re.findall(r"[^.\n]*\b(typically costs?|usually costs?|typical cost|in line with what|runs about|ballpark)\b[^.\n]*", out, re.I)
check("No cost estimates without bids (phrasing)", not typical, " | ".join(t if isinstance(t, str) else t[0] for t in typical))

out_nums = re.findall(r"\$?\d[\d,]*(?:\.\d+)?", out)
missing = sorted({n for n in out_nums if norm(n) not in allowed}, key=lambda x: (len(x), x))
dollars_missing = [n for n in missing if n.startswith("$")]
check("Every dollar amount appears in the inputs or is listed arithmetic", not dollars_missing, ", ".join(dollars_missing))

for name, ok, ev in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  [{ev}]" if ev else ""))
print("Numbers not found verbatim in the inputs (review each; dates and counts the skill computed are expected):")
print("  " + (", ".join(missing) if missing else "none"))
